import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root BEFORE importing app
dotenv.config({ path: resolve(__dirname, "../.env"), override: true });

// Dynamic import so env vars are loaded first
const { default: app } = await import("../api/_app.js");

const PORT = process.env.PORT || 3001;
const APP_ENV = process.env.APP_ENV || "production";

app.listen(PORT, () => {
  console.log(`\n🚀 DietByRD API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  if (APP_ENV === "dev") {
    console.log(`⚠️  DEV MODE: OTP codes will be printed to console`);
  }
  console.log();
});
