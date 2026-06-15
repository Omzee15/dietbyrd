import fs from 'fs';
let content = fs.readFileSync('api/_app.mjs', 'utf8');
content = content.replace(
  /LEFT JOIN dietbyrd_registered_patients rp ON rp\.patient_id = p\.id AND rp\.is_active = true/g,
  'LEFT JOIN dietbyrd_registered_patients rp ON rp.patient_id = p.id'
);
fs.writeFileSync('api/_app.mjs', content);
console.log("SQL query fixed!");
