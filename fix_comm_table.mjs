import fs from 'fs';
let appStr = fs.readFileSync('api/_app.mjs', 'utf8');

// Change target_user_id to recipient_email
appStr = appStr.replace(
  /target_user_id INTEGER REFERENCES dietbyrd_users\(id\) ON DELETE CASCADE,/,
  'target_email TEXT NOT NULL,'
);

appStr = appStr.replace(
  /app\.get\("\/api\/support\/communications\/:userId", async \(req, res\) => \{[\s\S]*?\} catch \(err\) \{/,
  `app.get("/api/support/communications", async (req, res) => {
    try {
      const email = req.query.email;
      const result = await query(
        \`SELECT c.*, u.name as sent_by_name
         FROM dietbyrd_communications c
         LEFT JOIN dietbyrd_users u ON c.sent_by = u.id
         WHERE c.target_email = $1
         ORDER BY c.created_at DESC\`,
        [email]
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {`
);

appStr = appStr.replace(
  /const \{ target_user_id, subject, body \} = req\.body;/,
  `const { target_email, subject, body } = req.body;`
);

appStr = appStr.replace(
  /if \(!target_user_id \|\| !subject \|\| !body\) \{/,
  `if (!target_email || !subject || !body) {`
);

appStr = appStr.replace(
  /INSERT INTO dietbyrd_communications \(target_user_id, sent_by, subject, body\)/,
  `INSERT INTO dietbyrd_communications (target_email, sent_by, subject, body)`
);

appStr = appStr.replace(
  /\[target_user_id, auth\.id, subject, body\]/,
  `[target_email, auth.id, subject, body]`
);

fs.writeFileSync('api/_app.mjs', appStr);
console.log("Updated communications API to use target_email");
