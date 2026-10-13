# Lambda Web Functions — Hello World

A minimal Express server you can deploy to **AWS Lambda Web Functions** with a
single command. No adapters, no wrappers — the same code runs locally and on Lambda.

```js
import express from 'express';

const app = express();
const [host, port] = process.env.AWS_LAMBDA_HTTP_ENDPOINT.split(':');

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Lambda Web Functions!' });
});

app.listen(port, host);
```

The only Lambda-specific detail: Lambda sets `AWS_LAMBDA_HTTP_ENDPOINT` to the
host and port your server must listen on. (This repo falls back to
`127.0.0.1:3000` locally so you don't have to set it by hand.)

## Run locally

```bash
npm install
npm start           # http://127.0.0.1:3000
curl 127.0.0.1:3000
# {"message":"Hello from Lambda Web Functions!"}
```

Or exactly as the launch blog shows it:

```bash
AWS_LAMBDA_HTTP_ENDPOINT=127.0.0.1:3000 node index.js
```

## Deploy to AWS

One command (requires AWS CLI v2.37.9+):

```bash
aws lambda-web deploy --name my-web-app --code .
```

The CLI bundles the source, creates the Web Function, publishes a revision,
attaches an endpoint, and returns a live HTTPS URL in under a minute. Test it:

```bash
curl https://<domain-id>.<shard-id>.lambda-web.us-east-1.on.aws/
```

### Serve multiple Regions (latency-based routing)

```bash
aws lambda-web deploy --name my-web-app --code . \
    --regions us-east-1,eu-west-1,ap-northeast-1
```

Requests route to the closest Region through one global URL
(`<domain-id>.lambda-web.global.on.aws`).

### Fastest possible start (built-in starter)

```bash
aws lambda-web deploy --name hello-world --hello-world
```

## Notes

- Runs **Node.js 24 (nodejs24.x) on Arm64** on Lambda.
- Available in us-east-1, us-east-2, us-west-2, ap-northeast-1, eu-west-1.
- Re-running `deploy` publishes a new revision and points the endpoint at it.
