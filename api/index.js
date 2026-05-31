import app from "./_app.mjs";

// For Vercel serverless functions
export default function handler(req, res) {
  return app(req, res);
}

// Also export app for local development
export { app };
