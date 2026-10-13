# How this demo works

A plain-English companion to the code. No prior Lambda knowledge needed.

## The one idea

A **Lambda Web Function** is just a normal web server (here, an Express app) that
**listens on a port**. You write it the way you'd write any Node.js server. The
*same code* runs on your laptop and on AWS Lambda. On Lambda, AWS tells your server
which port to use and sends HTTP requests straight to it — there's no special
"handler" function and no adapter glue.

The whole contract is one line:

```js
app.listen(process.env.PORT || 3000);
```

## What's in the project

| File | What it is |
|---|---|
| `server.js` | The Web Function. An Express server with a few endpoints and a live stats tracker. |
| `public/index.html` | The dashboard the server shows at `/`. Pure HTML/CSS/JS, no libraries. |
| `test-local.js` | An automated check that acts like a user and verifies the demo works. |
| `package.json` | Project metadata. Defines `npm start` and `npm run test:local`. |
| `README.md` | Quick start + the on-stage script + deploy command. |

## The endpoints `server.js` exposes

| Endpoint | Does what |
|---|---|
| `GET /` | Serves the dashboard web page. |
| `GET /api/env` | Reports this environment's id, region, uptime, request count, and how much time was spent on CPU vs. waiting. The dashboard polls this twice a second to update the stats bar. |
| `GET /api/stream` | Streams an answer back **one word at a time** using Server-Sent Events (SSE). This is the pattern you'd use to stream an AI model's output. |
| `GET /api/work?ms=1200` | Simulates a request that **waits** ~1.2s on a downstream call (like a database), then does a tiny bit of real CPU work. The concurrency demo fires 8 of these at once. |
| `GET /api/health` | A simple "I'm alive" check. |

## The three things the demo proves

### 1. Streaming
The server sends pieces of the response as they're ready instead of waiting to send
everything at the end. On the dashboard you see words appear one at a time, like a
chatbot typing. Useful for streaming AI/LLM output to users.

### 2. Concurrency on one warm environment
Old-style functions often spin up a fresh copy per request (a "cold start"). A Web
Function keeps **one warm environment** that handles many requests at the same time.
The demo fires 8 requests that each wait ~1.2 seconds. One-at-a-time that would take
~10 seconds; in parallel it finishes in about 1.2 seconds.

### 3. Active-CPU billing
Each request mostly **waits** (on a pretend database), then uses the CPU for a
moment. Web Functions bill you for the **CPU time**, not the waiting time. The
dashboard shows this as two bars: a big "idle wait" bar and a tiny "active CPU" bar.
You pay for the tiny one.

## What `npm run test:local` checks (and why you can trust it)

The test script starts the server and then **behaves like a browser hitting it**, so
you don't have to click every button by hand before going on stage. It checks:

1. **The dashboard loads** — requests `/` and confirms the web page comes back.
2. **It's one warm environment** — calls `/api/env` twice and confirms the same
   environment id both times (not a new one each request).
3. **Requests run in parallel** — fires 8 requests that each wait 0.8s and confirms
   they finish in roughly the time of *one* (not 8× longer). This proves the single
   environment served them concurrently.
4. **You don't pay to wait** — confirms the recorded "waiting" time is far larger
   than the "CPU" time, which is the billing story.
5. **Streaming works** — opens the streaming endpoint and confirms many small pieces
   arrive one after another.

If any check fails the script prints `FAIL` and stops. When it prints
**"All demo checks passed"**, the live demo is safe to present.

Run it yourself any time:

```bash
npm run test:local
```

## Running the demo

```bash
npm install     # one time
npm start       # then open http://localhost:3000
```

## Deploying to AWS

See `README.md`. In short, with AWS CLI v2.37.9+:

```bash
aws lambda-web deploy --name web-fn-demo --code . --entry-point server.js --create
```
