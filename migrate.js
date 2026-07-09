/**
 * migrate.js — Database tables create karo aur JSON data import karo
 *
 * (Uses existing database and adds prefix 'ap_' to tables to avoid conflicts)
 */

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');
require('dotenv').config();

const SOURCE_DIR = path.join(__dirname, 'src', 'assets', 'data');

const DB_NAME = process.env.DB_NAME || 'rozgaarsetu';
const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'rozgaarsetu',
  password: process.env.DB_PASSWORD || 'rozgaarsetu_dev',
  database: DB_NAME,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
};

const readJson = (file) => {
  const p = path.join(SOURCE_DIR, file);
  if (!fs.existsSync(p)) { console.log(`⚠️  Not found: ${file}`); return null; }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
};

async function migrate() {
  console.log('\n🚀 Airport Map — Database Setup & Migration (Prefixed Tables)');
  console.log('─'.repeat(60));
  console.log(`   MySQL  : ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log(`   User   : ${DB_CONFIG.user}`);
  console.log(`   DB     : ${DB_NAME}`);
  console.log(`   Source : ${SOURCE_DIR}`);
  console.log('─'.repeat(60) + '\n');

  // Connect
  const conn = await mysql.createConnection(DB_CONFIG);

  console.log('📋 Creating prefixed tables (ap_)...');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ap_floors (
      id         VARCHAR(100) PRIMARY KEY,
      level      VARCHAR(20)  NOT NULL,
      name       VARCHAR(100) NOT NULL,
      image      VARCHAR(255),
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ap_nodes (
      id          VARCHAR(200) PRIMARY KEY,
      floor       VARCHAR(100) NOT NULL,
      x           FLOAT        NOT NULL,
      y           FLOAT        NOT NULL,
      name        VARCHAR(200) NOT NULL,
      category    VARCHAR(100),
      type        VARCHAR(100),
      description TEXT,
      status      VARCHAR(100) DEFAULT 'Open',
      image_url   VARCHAR(500),
      is_custom   TINYINT(1)   DEFAULT 1,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_floor (floor)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ap_edges (
      id            VARCHAR(300) PRIMARY KEY,
      \`from\`        VARCHAR(200) NOT NULL,
      \`to\`          VARCHAR(200) NOT NULL,
      distance      FLOAT        DEFAULT 0,
      bidirectional TINYINT(1)   DEFAULT 1,
      \`accessible\`    TINYINT(1)   DEFAULT 1,
      blocked       TINYINT(1)   DEFAULT 0,
      created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_from (\`from\`),
      INDEX idx_to   (\`to\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ap_categories (
      id         VARCHAR(100) PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      icon       VARCHAR(20),
      color      VARCHAR(20),
      sort_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ap_custom_routes (
      id         VARCHAR(200) PRIMARY KEY,
      name       VARCHAR(200),
      node_ids   LONGTEXT,
      distance   FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅ All prefixed tables created\n');

  console.log('📥 Importing JSON data...');
  await conn.beginTransaction();
  try {

    // Floors
    const floors = readJson('floors.json');
    if (floors) {
      await conn.execute('DELETE FROM ap_floors');
      for (let i = 0; i < floors.length; i++) {
        const f = floors[i];
        await conn.execute(
          'INSERT INTO ap_floors (id, level, name, image, sort_order) VALUES (?,?,?,?,?)',
          [f.id, f.level, f.name, f.image || null, i]
        );
      }
      console.log(`   ✅ Floors     : ${floors.length} rows`);
    }

    // Graph (nodes + edges)
    const graph = readJson('graph.json');
    if (graph) {
      const nodes = graph.nodes || [];
      const edges = graph.edges || [];

      await conn.execute('DELETE FROM ap_nodes');
      for (const n of nodes) {
        await conn.execute(
          `INSERT INTO ap_nodes (id, floor, x, y, name, category, type, description, status, image_url, is_custom)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [n.id, n.floor, n.x, n.y, n.name,
           n.category||null, n.type||null, n.description||'',
           n.status||'Open', n.imageUrl||null, n.isCustom ? 1 : 0]
        );
      }
      console.log(`   ✅ Nodes      : ${nodes.length} rows`);

      await conn.execute('DELETE FROM ap_edges');
      for (const e of edges) {
        await conn.execute(
          `INSERT INTO ap_edges (id, \`from\`, \`to\`, distance, bidirectional, \`accessible\`, blocked)
           VALUES (?,?,?,?,?,?,?)`,
          [e.id, e.from, e.to, e.distance||0,
           e.bidirectional !== false ? 1 : 0,
           e.accessible    !== false ? 1 : 0,
           e.blocked ? 1 : 0]
        );
      }
      console.log(`   ✅ Edges      : ${edges.length} rows`);
    }

    // Categories
    const cats = readJson('categories.json');
    if (cats && Array.isArray(cats)) {
      await conn.execute('DELETE FROM ap_categories');
      for (let i = 0; i < cats.length; i++) {
        const c = cats[i];
        await conn.execute(
          'INSERT INTO ap_categories (id, name, icon, color, sort_order) VALUES (?,?,?,?,?)',
          [c.id||c.key, c.name||c.label, c.icon||null, c.color||null, i]
        );
      }
      console.log(`   ✅ Categories : ${cats.length} rows`);
    }

    // Custom routes
    const routes = readJson('custom_routes.json');
    if (routes && Array.isArray(routes)) {
      await conn.execute('DELETE FROM ap_custom_routes');
      for (const r of routes) {
        await conn.execute(
          'INSERT INTO ap_custom_routes (id, name, node_ids, distance) VALUES (?,?,?,?)',
          [r.id, r.name||'', JSON.stringify(r.node_ids||[]), r.distance||0]
        );
      }
      console.log(`   ✅ Routes     : ${routes.length} rows`);
    }

    await conn.commit();
    console.log('\n🎉 Setup complete! All data migrated to MySQL.');

  } catch (err) {
    await conn.rollback();
    console.error('\n❌ Import failed:', err.message);
  } finally {
    await conn.end();
  }
}

migrate().catch(err => {
  console.error('\n❌ Connection failed:', err.message);
  process.exit(1);
});
