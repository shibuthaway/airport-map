require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const fs = require('fs');
  const env = fs.readFileSync('.env', 'utf-8');
  const host = env.split('\n').find(l => l.startsWith('DB_HOST'))?.split('=')[1]?.trim();
  const user = env.split('\n').find(l => l.startsWith('DB_USER'))?.split('=')[1]?.trim();
  const pass = env.split('\n').find(l => l.startsWith('DB_PASSWORD'))?.split('=')[1]?.trim();
  const name = env.split('\n').find(l => l.startsWith('DB_NAME'))?.split('=')[1]?.trim();
  const dbUrl = 'mysql://' + user + ':' + pass + '@' + host + '/' + name;
  
  const pool = mysql.createPool({
    uri: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  const [rows] = await pool.execute('SELECT category, COUNT(*) as c FROM ap_nodes WHERE project_id = ? GROUP BY category', ['default']);
  console.log('Categories currently used in ap_nodes for default project:');
  console.log(rows);
  
  process.exit(0);
}
run();
