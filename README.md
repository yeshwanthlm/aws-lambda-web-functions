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

## Tests:

```sh
# Step 1: put it online
aws lambda-web deploy --name my-web-app --hello-world
curl <your-address>

# Step 2: change it, then deploy again
aws lambda-web deploy --name my-web-app --code ./my-web-app

# Step 3: ten percent to version 2
aws lambda-web update-web-function-endpoint \
  --function-name my-web-app --endpoint-name dev \
  --auto-deployment-mode Disabled \
  --revision-weights '[{"revisionId":"rev-8mqhy","weight":90},{"revisionId":"rev-jhhpy","weight":10}]'

# Step 3: undo, everyone back on version 1
aws lambda-web update-web-function-endpoint \
  --function-name my-web-app --endpoint-name dev \
  --auto-deployment-mode Disabled \
  --revision-weights '[{"revisionId":"rev-8mqhy","weight":100}]'

# Step 4: lock the door
aws lambda-web update-web-function-endpoint \
  --function-name my-web-app --endpoint-name dev --auth-type IamAuth

```
