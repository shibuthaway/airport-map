require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function migrate() {
  console.log('Connecting to DB...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });

  const conn = await pool.getConnection();
  try {
    console.log('Creating ap_projects...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_projects (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        logo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Creating ap_users...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        project_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert Default Project
    await conn.execute(`
      INSERT IGNORE INTO ap_projects (id, name, logo_url) 
      VALUES ('default', 'Chennai Airport T1', null)
    `);

    // Create Super Admin
    const superHash = await bcrypt.hash('admin123', 10);
    await conn.execute(`
      INSERT IGNORE INTO ap_users (id, username, password_hash, role, project_id) 
      VALUES ('superadmin_1', 'admin', ?, 'superadmin', null)
    `, [superHash]);

    // Create a Client Admin for the default project
    const clientHash = await bcrypt.hash('client123', 10);
    await conn.execute(`
      INSERT IGNORE INTO ap_users (id, username, password_hash, role, project_id) 
      VALUES ('client_1', 'chennai', ?, 'client', 'default')
    `, [clientHash]);

    console.log('Altering ap_floors...');
    try { await conn.execute("ALTER TABLE ap_floors ADD COLUMN project_id VARCHAR(100) DEFAULT 'default' AFTER id"); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    console.log('Altering ap_nodes...');
    try { await conn.execute("ALTER TABLE ap_nodes ADD COLUMN project_id VARCHAR(100) DEFAULT 'default' AFTER id"); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    try { await conn.execute("ALTER TABLE ap_nodes ADD INDEX idx_project (project_id)"); } catch(e) { if(e.code !== 'ER_DUP_KEYNAME') throw e; }
    
    console.log('Altering ap_edges...');
    try { await conn.execute("ALTER TABLE ap_edges ADD COLUMN project_id VARCHAR(100) DEFAULT 'default' AFTER id"); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    try { await conn.execute("ALTER TABLE ap_edges ADD INDEX idx_project (project_id)"); } catch(e) { if(e.code !== 'ER_DUP_KEYNAME') throw e; }
    
    console.log('Altering ap_custom_routes...');
    try { await conn.execute("ALTER TABLE ap_custom_routes ADD COLUMN project_id VARCHAR(100) DEFAULT 'default' AFTER id"); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    console.log('Altering ap_categories...');
    // Categories can remain global, but let's give them a project_id just in case
    try { await conn.execute("ALTER TABLE ap_categories ADD COLUMN project_id VARCHAR(100) DEFAULT 'default' AFTER id"); } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    console.log('Migration Complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    conn.release();
    pool.end();
  }
}

migrate();
