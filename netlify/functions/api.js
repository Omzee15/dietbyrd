let cachedHandler;

exports.handler = async (event, context) => {
  if (!cachedHandler) {
    const [{ default: serverless }, { default: app }] = await Promise.all([
      import("serverless-http"),
      import("../../api/_app.js"),
    ]);
    cachedHandler = serverless(app, { basePath: "/.netlify/functions/api" });
  }

  return cachedHandler(event, context);
};
