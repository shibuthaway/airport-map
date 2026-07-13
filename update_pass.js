const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function update() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'rozgaarsetu',
    password: process.env.DB_PASSWORD || 'rozgaarsetu_dev',
    database: process.env.DB_NAME || 'rozgaarsetu',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  const hash = await bcrypt.hash('Dheerajpooja@1992', 10);
  await pool.execute("UPDATE ap_users SET password_hash = ? WHERE username = 'admin'", [hash]);
  console.log('Password updated successfully');
  process.exit(0);
}
update();
