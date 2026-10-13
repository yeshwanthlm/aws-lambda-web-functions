import express from 'express';

const app = express();

// Lambda Web Functions set AWS_LAMBDA_HTTP_ENDPOINT to the host:port your
// server must listen on. Locally, we fall back to 127.0.0.1:3000.
const endpoint = process.env.AWS_LAMBDA_HTTP_ENDPOINT || '127.0.0.1:3000';
const [host, port] = endpoint.split(':');

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Lambda Web Functions!' });
});

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
