const serverless = require("serverless-http");

let cachedHandler;

exports.handler = async (event, context) => {
  if (!cachedHandler) {
    const { default: app } = await import("../../api/_app.js");
    cachedHandler = serverless(app, { basePath: "/.netlify/functions/api" });
  }

  return cachedHandler(event, context);
};
