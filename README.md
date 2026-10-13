# Lambda Web Functions — live demo

A Lambda Web Function is **just an HTTP server that listens on a port**. No handler
signature, no adapter around your framework. The same `server.js` runs locally and
on Lambda — on Lambda the platform sets `PORT` and routes HTTP requests straight to
your server.

This repo serves a single-page **dashboard** (`public/index.html`) from the Web
Function itself, with three interactive panels that make the Web Functions story
visible to an audience.

## Run it

```bash
npm install
npm start          # http://localhost:3000  ← open this on stage
```

Automated checks (starts server, exercises the API, asserts behavior, exits):

```bash
npm run test:local
```

## The three "aha" moments (left → right on the dashboard)

| Panel | What the audience sees | Why it matters |
|---|---|---|
| **Streaming (SSE)** | Click *Stream a response* → tokens appear one at a time, like an LLM typing. | Your server streams results to users as they're ready. Native response streaming. |
| **Concurrency** | Click *Fire 8 concurrent requests* → 8 lanes fill together; the burst finishes in ~1.2s, not ~10s. | One **warm environment** serves many requests in parallel. Cold starts drop by orders of magnitude. |
| **Active-CPU billing** | The green (CPU) bar stays tiny while the gray (idle wait) bar grows. | You pay for **active CPU + memory**, not for time spent waiting on a DB or downstream call. |

The top bar shows the live **env id**, region, uptime, total requests, and in-flight
count. Open the page in two browser tabs — same env id = same warm environment
serving both.

## Suggested 3-minute stage script

1. **Set up (15s):** "A Web Function is just an HTTP server. Here's an Express app
   listening on a port — the same code runs locally and on Lambda, no adapter."
2. **Streaming (30s):** Click *Stream a response*. "Tokens reach the user as they're
   produced. This is how you'd stream LLM output."
3. **Concurrency (45s):** Click *Fire 8 concurrent requests*. "Each waits ~1.2s on a
   downstream call. Serially that's ~10 seconds. Watch…" → finishes in ~1.2s. "One
   warm environment, all eight in parallel."
4. **Billing (30s):** Point at the bars. "Everything we just ran mostly *waited*.
   You pay for the little green sliver of CPU, not the gray waiting. That's the
   Web Functions pricing model."
5. **Close (20s):** "Same Lambda you trust, now a primitive for HTTP."

## Deploy to AWS (one command)

Requires **AWS CLI v2.37.9+** (`aws lambda-web ...`).

```bash
# deploy this app's code and print the HTTPS endpoint:
aws lambda-web deploy --name web-fn-demo --code . --entry-point server.js --create

# or the built-in starter:
aws lambda-web deploy --name hello-web --hello-world --create
```

Useful flags: `--runtime nodejs24.x` (default), `--env KEY=VALUE` (repeatable),
`--regions <list>` + `--auto-deployment-mode` for multi-Region serving,
`--max-concurrency-per-environment`, `--rate-limit`, `--timeout-seconds`.
Omit `--execution-role-arn` and the CLI creates one for you.

Full reference: https://docs.aws.amazon.com/cli/latest/reference/lambda-web/deploy.html

## Notes

- Web Functions is **Node.js only**, zip-based, On-Demand only.
- The whole contract is: **listen on `process.env.PORT`.**
