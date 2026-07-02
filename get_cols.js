import dotenv from "dotenv";
dotenv.config();
import pg from 'pg';
const pool = new pg.Pool();
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'dietbyrd_consultations'").then(r => {
  console.log(r.rows);
  process.exit(0);
});
