// ============================================================================
//  Lambda Web Function — live demo server
//
//  A Web Function is just an HTTP server listening on a port. No handler
//  signature, no adapter. This same file runs locally and on Lambda; on Lambda
//  the platform sets PORT and routes HTTP straight to your server.
//
//  It serves a single-page dashboard (public/index.html) plus a small JSON/SSE
//  API that the dashboard calls to visualize the three Web Functions "aha"s:
//    1. Streaming      — tokens pushed to the browser as they're ready (SSE)
//    2. Concurrency    — one warm environment serves a burst in parallel
//    3. Active-CPU     — you pay for CPU time, not time spent waiting on I/O
// ============================================================================

import express from "express";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// Environment identity + counters.
// These live in module scope, so they persist for the LIFETIME of this warm
// execution environment and are shared across every request it handles. That
// is the whole point of Web Functions: one warm env, many requests.
// ---------------------------------------------------------------------------
const ENV_ID = randomUUID().slice(0, 8);
const BOOTED_AT = Date.now();
let totalRequests = 0;
let inFlight = 0;
let peakInFlight = 0;
let activeCpuMs = 0; // time we actually burned CPU
let idleWaitMs = 0; // time we spent awaiting I/O (NOT billed as active CPU)

app.use((req, res, next) => {
  totalRequests++;
  inFlight++;
  peakInFlight = Math.max(peakInFlight, inFlight);
  res.on("finish", () => inFlight--);
  next();
});

// Serve the dashboard and its assets.
app.use(express.static(join(__dirname, "public")));

// ---------------------------------------------------------------------------
// /api/env — who am I, and how busy have I been?
// Call this from two browser tabs: same env id => same warm environment.
// ---------------------------------------------------------------------------
app.get("/api/env", (req, res) => {
  res.json({
    envId: ENV_ID,
    region: process.env.AWS_REGION || "local",
    runtime: `node ${process.version}`,
    upMs: Date.now() - BOOTED_AT,
    totalRequests,
    inFlight,
    peakInFlight,
    activeCpuMs: Math.round(activeCpuMs),
    idleWaitMs: Math.round(idleWaitMs),
  });
});

// ---------------------------------------------------------------------------
// /api/stream — Server-Sent Events. Streams an "AI answer" one token at a
// time. This is the LLM-token-streaming pattern: results reach the user as
// they're produced, instead of waiting for the whole response.
// ---------------------------------------------------------------------------
const DEMO_ANSWER =
  "Lambda Web Functions let you run a normal HTTP server on Lambda. " +
  "You listen on a port, use Express or Hono, and stream responses to users " +
  "as they are ready. One warm environment serves many requests at once, so " +
  "cold starts drop by orders of magnitude. You pay for active CPU plus memory, " +
  "not for time spent waiting on a database or a downstream call.";

app.get("/api/stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const tokens = DEMO_ANSWER.split(" ");
  for (const token of tokens) {
    res.write(`data: ${JSON.stringify({ token: token + " " })}\n\n`);
    // Awaiting the timer is idle wait, not CPU. The env stays free to serve
    // other requests while this stream is paced out.
    const t = 60;
    idleWaitMs += t;
    await sleep(t);
  }
  res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// ---------------------------------------------------------------------------
// /api/work — a single unit of "work" the concurrency demo fires in a burst.
// It mostly WAITS (simulating a DB / downstream call), with a tiny bit of real
// CPU at the end. Returns timing so the UI can show that N concurrent requests
// finish in ~the time of one, because the warm env runs them in parallel.
// ---------------------------------------------------------------------------
app.get("/api/work", async (req, res) => {
  const started = Date.now();
  const waitMs = clamp(Number(req.query.ms) || 1200, 50, 10000);

  // --- idle wait (downstream I/O): not billed as active CPU ---
  idleWaitMs += waitMs;
  await sleep(waitMs);

  // --- a little real CPU work so active-CPU time is non-zero ---
  const cpu0 = Date.now();
  let acc = 0;
  for (let i = 0; i < 2_000_000; i++) acc += Math.sqrt(i);
  activeCpuMs += Date.now() - cpu0;

  res.json({
    id: req.query.id ?? null,
    envId: ENV_ID,
    waitedMs: waitMs,
    totalMs: Date.now() - started,
    checksum: Math.round(acc),
    servedConcurrentlyWith: inFlight - 1,
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true, envId: ENV_ID }));

app.listen(PORT, () => {
  console.log(`\n  Lambda Web Function demo`);
  console.log(`  env ${ENV_ID}  ·  listening on http://localhost:${PORT}\n`);
});

// --- helpers ---------------------------------------------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
