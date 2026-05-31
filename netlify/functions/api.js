const serverless = require("serverless-http");
const appModule = require("../../api/_app.js");

const app = appModule?.default || appModule;

exports.handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
