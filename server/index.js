import dotenv from "dotenv";
dotenv.config();

import app from "../api/_app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 DietByRD API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});
