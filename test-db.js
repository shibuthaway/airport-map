const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  
  try {
    await pool.execute("ALTER TABLE ap_projects ADD COLUMN public_slug VARCHAR(255)");
    console.log("Added column");
  } catch (e) {
    console.log("Col error:", e.message);
  }
  
  try {
    await pool.execute("ALTER TABLE ap_projects ADD UNIQUE INDEX idx_slug (public_slug)");
    console.log("Added index");
  } catch (e) {
    console.log("Idx error:", e.message);
  }

  pool.end();
}
run();
