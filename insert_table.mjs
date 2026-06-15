import fs from 'fs';
let appStr = fs.readFileSync('api/_app.mjs', 'utf8');

if (!appStr.includes('dietbyrd_communications')) {
  appStr = appStr.replace(
    /await query\(`\n\s*CREATE TABLE IF NOT EXISTS dietbyrd_tickets/,
    `await query(\`\n      CREATE TABLE IF NOT EXISTS dietbyrd_communications (\n        id SERIAL PRIMARY KEY,\n        target_user_id INTEGER REFERENCES dietbyrd_users(id) ON DELETE CASCADE,\n        sent_by INTEGER REFERENCES dietbyrd_users(id),\n        subject TEXT NOT NULL,\n        body TEXT NOT NULL,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n      )\n    \`);\n\n    await query(\`\n      CREATE TABLE IF NOT EXISTS dietbyrd_tickets`
  );

  const newEndpoints = `
  // ==========================================
  // COMMUNICATIONS / EMAIL LOGS
  // ==========================================

  app.get("/api/support/communications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await query(
        \`SELECT c.*, u.name as sent_by_name
         FROM dietbyrd_communications c
         LEFT JOIN dietbyrd_users u ON c.sent_by = u.id
         WHERE c.target_user_id = $1
         ORDER BY c.created_at DESC\`,
        [userId]
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("[communications/get] Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/support/communications", async (req, res) => {
    try {
      const { target_user_id, subject, body } = req.body;
      const auth = await getAuthContextFromHeaders(req);
      if (auth.error) {
        return res.status(401).json({ success: false, error: auth.error });
      }

      if (!target_user_id || !subject || !body) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const result = await query(
        \`INSERT INTO dietbyrd_communications (target_user_id, sent_by, subject, body)
         VALUES ($1, $2, $3, $4)
         RETURNING *\`,
        [target_user_id, auth.id, subject, body]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error("[communications/post] Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  `;

  appStr = appStr.replace(
    /\/\/ ==========================================\n\s*\/\/ SUPPORT TEAM ENDPOINTS/,
    newEndpoints + '\n  // ==========================================\n  // SUPPORT TEAM ENDPOINTS'
  );

  fs.writeFileSync('api/_app.mjs', appStr);
  console.log("Injected communications table and endpoints");
}
