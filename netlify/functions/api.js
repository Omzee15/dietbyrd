import serverless from "serverless-http";
import app from "../../api/_app.js";

export const handler = serverless(app, {
  basePath: "/.netlify/functions/api"
});
