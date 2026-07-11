/**
 * backup.js — Database Tables backup script (Generates SQL file)
 *
 * Run: node backup.js
 * Saves backup file: airport_map_backup.sql inside project root
 */

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'rozgaarsetu';
const BACKUP_FILE = path.join(__dirname, 'airport_map_backup.sql');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'rozgaarsetu',
  password: process.env.DB_PASSWORD || 'rozgaarsetu_dev',
  database: DB_NAME,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

const TABLES = [
  'ap_projects',
  'ap_users',
  'ap_buildings',
  'ap_floors',
  'ap_nodes',
  'ap_edges',
  'ap_categories',
  'ap_custom_routes'
];

async function getCreateTableSQL(conn, table) {
  const [rows] = await conn.execute(`SHOW CREATE TABLE \`${table}\``);
  if (rows && rows[0]) {
    return rows[0]['Create Table'] + ';';
  }
  return '';
}

async function getInsertsSQL(conn, table) {
  const [rows] = await conn.execute(`SELECT * FROM \`${table}\``);
  if (!rows || rows.length === 0) return '';

  const sqls = [];
  for (const row of rows) {
    const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
    const vals = Object.values(row).map(val => {
      if (val === null) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (val instanceof Date) {
        return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
      }
      // Handle string/json
      let escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `'${escaped}'`;
    }).join(', ');

    sqls.push(`INSERT INTO \`${table}\` (${keys}) VALUES (${vals});`);
  }
  return sqls.join('\n');
}

async function runBackup() {
  console.log('\n📦 Starting Database Backup...');
  console.log(`   Source DB : ${DB_NAME}`);
  console.log(`   Output    : ${BACKUP_FILE}\n`);

  const conn = await pool.getConnection();
  let sqlContent = `-- Airport Map Database Backup\n`;
  sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
  sqlContent += `-- Database: ${DB_NAME}\n\n`;
  sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  try {
    for (const table of TABLES) {
      console.log(`   Processing table: ${table}...`);
      sqlContent += `-- ------------------------------------------------------\n`;
      sqlContent += `-- Table structure and data for ${table}\n`;
      sqlContent += `-- ------------------------------------------------------\n\n`;
      sqlContent += `DROP TABLE IF EXISTS \`${table}\`;\n`;

      // Get Table Create SQL
      const createSql = await getCreateTableSQL(conn, table);
      sqlContent += createSql + '\n\n';

      // Get Inserts SQL
      const insertsSql = await getInsertsSQL(conn, table);
      if (insertsSql) {
        sqlContent += insertsSql + '\n\n';
      }
    }

    sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    fs.writeFileSync(BACKUP_FILE, sqlContent, 'utf-8');
    console.log(`\n🎉 Backup saved successfully to:`);
    console.log(`   👉 ${BACKUP_FILE}\n`);

  } catch (err) {
    console.error('\n❌ Backup failed:', err.message);
  } finally {
    conn.release();
    pool.end();
  }
}

runBackup();
