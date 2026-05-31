import app from "./_app.mjs";

// Catch-all handler for all /api/* routes
export default function handler(req, res) {
  return app(req, res);
}
