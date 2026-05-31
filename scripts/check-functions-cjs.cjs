const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "netlify", "functions");

const problems = [];

function scan(currentDir) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
      continue;
    }
    if (!/\.(js|mjs)$/.test(entry.name)) {
      continue;
    }
    const src = fs.readFileSync(full, "utf8");
    const hasCjsExport = /\b(module\.exports|exports\.)/m.test(src);
    const hasRequire = /\brequire\s*\(/m.test(src);
    if (hasCjsExport || hasRequire) {
      problems.push(`${full}: uses CommonJS syntax in ESM functions`);
    }
  }
}

scan(dir);

if (problems.length) {
  console.error("\n❌ Netlify Functions module-system issues:\n");
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
} else {
  console.log("✅ All Netlify functions use ESM syntax");
}
