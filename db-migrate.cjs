const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function migrate() {
  await client.connect();
  await client.query('ALTER TABLE dietbyrd_patients ADD COLUMN IF NOT EXISTS email text;');
  await client.query('ALTER TABLE dietbyrd_patients ADD COLUMN IF NOT EXISTS region_preference text;');
  await client.query('ALTER TABLE dietbyrd_patients ADD COLUMN IF NOT EXISTS language_preference text;');
  console.log('Migration successful');
  await client.end();
}
migrate().catch(console.error);
