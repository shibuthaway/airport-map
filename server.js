/**
 * server.js — MySQL-backed Express server for Airport Indoor Map
 *
 * Uses 'ap_' prefixed tables inside existing MySQL DB.
 */

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/poi-images', express.static(path.join(__dirname, 'public', 'poi-images')));
app.use('/maps',       express.static(path.join(__dirname, 'public', 'maps')));

// ── MySQL Pool ─────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'rozgaarsetu',
  password:           process.env.DB_PASSWORD || 'rozgaarsetu_dev',
  database:           process.env.DB_NAME     || 'rozgaarsetu',
  waitForConnections: true,
  connectionLimit:    10,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

// ── Create Tables On Startup ───────────────────────────────────────────────────
async function initDB() {
  const conn = await pool.getConnection();
  try {
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

    console.log('✅ Prefixed MySQL tables ready');
  } finally {
    conn.release();
  }
}

// ── DATABASE BROWSER VIEWER ────────────────────────────────────────────────────
app.get('/admin/db', async (req, res) => {
  try {
    const [floors] = await pool.execute('SELECT * FROM ap_floors ORDER BY sort_order');
    const [nodes] = await pool.execute('SELECT * FROM ap_nodes ORDER BY created_at DESC');
    const [edges] = await pool.execute('SELECT * FROM ap_edges ORDER BY created_at DESC');
    const [categories] = await pool.execute('SELECT * FROM ap_categories ORDER BY sort_order');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MySQL Tables Viewer — Airport Map</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #0b0f19;
            color: #f1f5f9;
            padding: 40px 20px;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
          }
          header {
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #60a5fa, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .db-info {
            font-size: 14px;
            background: rgba(59, 130, 246, 0.1);
            border: 1px dashed rgba(59, 130, 246, 0.3);
            padding: 8px 16px;
            border-radius: 8px;
            color: #93c5fd;
          }
          .tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 12px;
          }
          .tab-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 15px;
            font-weight: 500;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
          }
          .tab-btn:hover {
            color: #fff;
            background: rgba(255,255,255,0.05);
          }
          .tab-btn.active {
            color: #fff;
            background: #2563eb;
          }
          .tab-content {
            display: none;
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
          }
          .tab-content.active {
            display: block;
          }
          .table-wrapper {
            overflow-x: auto;
            max-height: 600px;
            overflow-y: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 14px;
          }
          th {
            background: #1e293b;
            padding: 14px 16px;
            font-weight: 600;
            color: #94a3b8;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: #e2e8f0;
          }
          tr:hover td {
            background: rgba(255,255,255,0.02);
          }
          .tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .tag-floor { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
          .tag-type { background: rgba(16, 185, 129, 0.2); color: #34d399; }
          .empty-state {
            text-align: center;
            padding: 40px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div>
              <h1>Airport Indoor Map — MySQL Tables</h1>
              <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Browse and check your migrated database tables directly</p>
            </div>
            <div class="db-info">
              Connected: <strong>rozgaarsetu</strong>@localhost
            </div>
          </header>

          <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('floors')">ap_floors (${floors.length})</button>
            <button class="tab-btn" onclick="switchTab('nodes')">ap_nodes (${nodes.length})</button>
            <button class="tab-btn" onclick="switchTab('edges')">ap_edges (${edges.length})</button>
            <button class="tab-btn" onclick="switchTab('categories')">ap_categories (${categories.length})</button>
          </div>

          <!-- Floors Content -->
          <div id="floors" class="tab-content active">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Level</th>
                    <th>Name</th>
                    <th>Map Image</th>
                    <th>Sort Order</th>
                  </tr>
                </thead>
                <tbody>
                  ${floors.map(f => `
                    <tr>
                      <td><code>${f.id}</code></td>
                      <td><span class="tag tag-floor">${f.level}</span></td>
                      <td><strong>${f.name}</strong></td>
                      <td><code>${f.image}</code></td>
                      <td>${f.sort_order}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Nodes Content -->
          <div id="nodes" class="tab-content">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Node ID</th>
                    <th>Floor</th>
                    <th>Coordinates (x, y)</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${nodes.map(n => `
                    <tr>
                      <td><code>${n.id}</code></td>
                      <td><span class="tag tag-floor">${n.floor}</span></td>
                      <td><code>${n.x.toFixed(1)}, ${n.y.toFixed(1)}</code></td>
                      <td><strong>${n.name}</strong></td>
                      <td>${n.category || '-'}</td>
                      <td><span class="tag tag-type">${n.type || 'node'}</span></td>
                      <td>${n.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Edges Content -->
          <div id="edges" class="tab-content">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Edge ID</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Distance</th>
                    <th>Birectional</th>
                    <th>Accessible</th>
                    <th>Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  ${edges.map(e => `
                    <tr>
                      <td><code>${e.id}</code></td>
                      <td><code>${e.from}</code></td>
                      <td><code>${e.to}</code></td>
                      <td>${e.distance.toFixed(1)}px</td>
                      <td>${e.bidirectional ? '✅ Yes' : '❌ No'}</td>
                      <td>${e.accessible ? '✅ Yes' : '❌ No'}</td>
                      <td>${e.blocked ? '⚠️ Yes' : '✅ No'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Categories Content -->
          <div id="categories" class="tab-content">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Category ID</th>
                    <th>Name</th>
                    <th>Icon</th>
                    <th>Color</th>
                    <th>Sort Order</th>
                  </tr>
                </thead>
                <tbody>
                  ${categories.map(c => `
                    <tr>
                      <td><code>${c.id}</code></td>
                      <td><strong>${c.name}</strong></td>
                      <td>${c.icon || '-'}</td>
                      <td style="color: ${c.color || '#fff'}">● ${c.color || '-'}</td>
                      <td>${c.sort_order}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <script>
          function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.currentTarget.classList.add('active');
            document.getElementById(tabId).classList.add('active');
          }
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send(`Error loading DB view: ${err.message}`);
  }
});

// ── FLOORS ─────────────────────────────────────────────────────────────────────
app.get('/api/load-floors', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, level, name, image FROM ap_floors ORDER BY sort_order');
    if (rows.length === 0) {
      return res.json([
        { id: 'arrival',   level: 'L1', name: 'Arrival',   image: '/maps/arrival.jpg' },
        { id: 'departure', level: 'L2', name: 'Departure', image: '/maps/departure.jpg' },
      ]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-floors', async (req, res) => {
  const floors = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM ap_floors');
    for (let i = 0; i < floors.length; i++) {
      const f = floors[i];
      await conn.execute(
        'INSERT INTO ap_floors (id, level, name, image, sort_order) VALUES (?,?,?,?,?)',
        [f.id, f.level, f.name, f.image || null, i]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── GRAPH (nodes + edges) ──────────────────────────────────────────────────────
app.get('/api/load-graph', async (req, res) => {
  try {
    const [nodes] = await pool.execute(
      'SELECT id, floor, x, y, name, category, type, description, status, image_url AS imageUrl, is_custom AS isCustom FROM ap_nodes'
    );
    const [edges] = await pool.execute(
      'SELECT id, `from`, `to`, distance, bidirectional, `accessible`, blocked FROM ap_edges'
    );
    res.json({
      nodes: nodes.map(n => ({ ...n, isCustom: !!n.isCustom })),
      edges: edges.map(e => ({
        ...e,
        bidirectional: !!e.bidirectional,
        accessible:    !!e.accessible,
        blocked:       !!e.blocked,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-graph', async (req, res) => {
  const { nodes = [], edges = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert nodes
    for (const n of nodes) {
      await conn.execute(`
        INSERT INTO ap_nodes (id, floor, x, y, name, category, type, description, status, image_url, is_custom)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          floor=VALUES(floor), x=VALUES(x), y=VALUES(y), name=VALUES(name),
          category=VALUES(category), type=VALUES(type), description=VALUES(description),
          status=VALUES(status), image_url=VALUES(image_url), is_custom=VALUES(is_custom)
      `, [
        n.id, n.floor, n.x, n.y, n.name,
        n.category||null, n.type||null, n.description||'',
        n.status||'Open', n.imageUrl||null, n.isCustom ? 1 : 0
      ]);
    }
    // Delete removed nodes
    if (nodes.length > 0) {
      const ph = nodes.map(() => '?').join(',');
      await conn.execute(`DELETE FROM ap_nodes WHERE id NOT IN (${ph})`, nodes.map(n => n.id));
    } else {
      await conn.execute('DELETE FROM ap_nodes');
    }

    // Upsert edges
    for (const e of edges) {
      await conn.execute(`
        INSERT INTO ap_edges (id, \`from\`, \`to\`, distance, bidirectional, \`accessible\`, blocked)
        VALUES (?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          \`from\`=VALUES(\`from\`), \`to\`=VALUES(\`to\`), distance=VALUES(distance),
          bidirectional=VALUES(bidirectional), \`accessible\`=VALUES(\`accessible\`), blocked=VALUES(blocked)
      `, [
        e.id, e.from, e.to, e.distance||0,
        e.bidirectional !== false ? 1 : 0,
        e.accessible    !== false ? 1 : 0,
        e.blocked ? 1 : 0
      ]);
    }
    // Delete removed edges
    if (edges.length > 0) {
      const ph = edges.map(() => '?').join(',');
      await conn.execute(`DELETE FROM ap_edges WHERE id NOT IN (${ph})`, edges.map(e => e.id));
    } else {
      await conn.execute('DELETE FROM ap_edges');
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── CUSTOM ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/load-routes', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM ap_custom_routes');
    res.json(rows.map(r => ({ ...r, node_ids: JSON.parse(r.node_ids || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-routes', async (req, res) => {
  const routes = Array.isArray(req.body) ? req.body : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM ap_custom_routes');
    for (const r of routes) {
      await conn.execute(
        'INSERT INTO ap_custom_routes (id, name, node_ids, distance) VALUES (?,?,?,?)',
        [r.id, r.name||'', JSON.stringify(r.node_ids||[]), r.distance||0]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── IMAGE UPLOAD ───────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    const dir = isVercel ? '/tmp' : path.join(__dirname, 'public', 'poi-images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

app.post('/api/upload-poi-image',  upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/poi-images/${req.file.filename}` });
});

app.post('/api/upload-floor-map', upload.single('map'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/maps/${req.file.filename}` });
});

// ── Serve React Build ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

// ── Start ──────────────────────────────────────────────────────────────────────
initDB().then(() => {
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`\n✅ Airport Map (MySQL) → http://localhost:${PORT}`);
      console.log(`   DB: ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
    });
  }
}).catch(err => {
  console.error('❌ DB failed:', err.message);
  process.exit(1);
});

module.exports = app;
