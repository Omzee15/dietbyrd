import serverless from "serverless-http";
import app from "../../api/_app.mjs";

const handler = serverless(app, { 
  basePath: "/.netlify/functions/api",
  binary: ['image/*', 'application/pdf', 'application/octet-stream', 'application/*', '*/*']
});

export { handler };
