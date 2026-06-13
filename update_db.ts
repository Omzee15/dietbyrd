import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
import { SEED_FOODS } from './src/lib/diet-constants';

async function updateDb() {
  for (const f of SEED_FOODS) {
    if (f.unit_name) {
      await pool.query('UPDATE dietbyrd_food_library SET unit_name = $1, unit_weight_g = $2 WHERE id = $3', [f.unit_name, f.unit_weight_g, f.id]);
    }
  }
  console.log('Updated db');
  await pool.end();
}

updateDb().catch(console.error);
