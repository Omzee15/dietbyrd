import fs from 'fs';
let appStr = fs.readFileSync('api/_app.mjs', 'utf8');

// 1. Inject auto-close logic into both ticket fetch endpoints
const autoCloseSql = `
    // Auto-close tickets resolved > 72h ago
    await query(\`UPDATE dietbyrd_tickets SET status = 'closed' WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '72 hours'\`);
`;

appStr = appStr.replace(
  /app\.get\("\/api\/support\/tickets", async \(req, res\) => \{\n\s*try \{/,
  `app.get("/api/support/tickets", async (req, res) => {\n    try {\n${autoCloseSql}`
);

appStr = appStr.replace(
  /app\.get\("\/api\/patient\/me\/tickets", async \(req, res\) => \{\n\s*try \{/,
  `app.get("/api/patient/me/tickets", async (req, res) => {\n    try {\n${autoCloseSql}`
);

// 2. Add reopen endpoint
const reopenEndpoint = `
  app.patch("/api/patient/me/tickets/:id/reopen", async (req, res) => {
    try {
      const auth = await getAuthContextFromHeaders(req);
      if (auth.error) {
        return res.status(401).json({ success: false, error: auth.error });
      }

      const ticketId = parseInt(req.params.id, 10);
      if (!Number.isInteger(ticketId)) {
        return res.status(400).json({ success: false, error: "Invalid ticket ID" });
      }

      const result = await query(
        \`UPDATE dietbyrd_tickets
         SET status = 'open', resolved_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND patient_id = $2 AND status = 'resolved' AND resolved_at >= NOW() - INTERVAL '72 hours'
         RETURNING *\`,
        [ticketId, auth.id]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, error: "Ticket cannot be reopened. It may have already been closed or 72 hours have passed." });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error("[patient/tickets/reopen] Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
`;

appStr = appStr.replace(
  /app\.post\("\/api\/patient\/me\/tickets", async \(req, res\) => \{/,
  reopenEndpoint + '\n\n  app.post("/api/patient/me/tickets", async (req, res) => {'
);

fs.writeFileSync('api/_app.mjs', appStr);
console.log("Updated API with ticket reopen and auto-close logic.");
