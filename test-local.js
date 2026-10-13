// Starts the server, exercises the demo API, asserts the Web Functions
// behaviors, then exits. Run: npm run test:local

import { spawn } from "node:child_process";

const PORT = 3100;
const base = `http://localhost:${PORT}`;

const server = spawn("node", ["server.js"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "inherit"],
});

const ready = new Promise((resolve) => {
  server.stdout.on("data", (d) => {
    process.stdout.write(`[server] ${d}`);
    if (d.toString().includes("listening")) resolve();
  });
});

const fail = (msg) => { console.error("FAIL:", msg); server.kill(); process.exit(1); };

await ready;

try {
  // 1. Dashboard is served at /
  const html = await (await fetch(base + "/")).text();
  if (!html.includes("Lambda")) fail("dashboard not served at /");
  console.log("[/] dashboard served ✓");

  // 2. /api/env identity is stable (same warm env) and counters move
  const e1 = await (await fetch(base + "/api/env")).json();
  const e2 = await (await fetch(base + "/api/env")).json();
  console.log("[/api/env] envId:", e1.envId, "| requests:", e2.totalRequests);
  if (e1.envId !== e2.envId) fail("env id changed between requests");
  if (e2.totalRequests <= e1.totalRequests) fail("request counter did not advance");

  // 3. Concurrency: 8 waiting requests finish in ~one request's time
  const WAIT = 800, N = 8;
  const t0 = Date.now();
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      fetch(`${base}/api/work?ms=${WAIT}&id=${i}`).then((r) => r.json()))
  );
  const wall = Date.now() - t0;
  const oneEnv = new Set(results.map((r) => r.envId)).size === 1;
  console.log(`[/api/work x${N}] wall ${wall}ms · one env: ${oneEnv} · max observed concurrent: ${Math.max(...results.map(r => r.servedConcurrentlyWith)) + 1}`);
  if (!oneEnv) fail("burst was not served by a single environment");
  if (wall > WAIT * 3) fail(`burst did not run in parallel (${wall}ms for ${N}x${WAIT}ms)`);

  // 4. Active-CPU accounting: idle wait >> active CPU
  const env = await (await fetch(base + "/api/env")).json();
  console.log(`[active-cpu] idleWait ${env.idleWaitMs}ms vs activeCpu ${env.activeCpuMs}ms`);
  if (!(env.idleWaitMs > env.activeCpuMs)) fail("idle wait should exceed active CPU in this demo");

  // 5. Streaming: tokens arrive incrementally over SSE
  console.log("[/api/stream] receiving tokens:");
  const res = await fetch(base + "/api/stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let chunks = 0, assembled = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const obj = JSON.parse(line.slice(6));
          if (obj.token) { chunks++; assembled += obj.token; }
        } catch {}
      }
    }
  }
  console.log(`  received ${chunks} token events`);
  if (chunks < 10) fail("expected many streamed token events");
  console.log("  first words:", assembled.split(" ").slice(0, 6).join(" ") + "…");

  console.log("\nAll demo checks passed. Open http://localhost:3000 to present.");
} catch (e) {
  fail(e.message || String(e));
} finally {
  server.kill();
}
