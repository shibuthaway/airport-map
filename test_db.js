const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'rozgaarsetu',
    password: process.env.DB_PASSWORD || 'rozgaarsetu_dev',
    database: process.env.DB_NAME || 'rozgaarsetu',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  const [rows] = await pool.query('SELECT * FROM ap_floors');
  console.log(rows);
  pool.end();
}
run();
