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
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_airport_jwt_key_2026';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const isVercelEnv = process.env.VERCEL || process.env.VERCEL_ENV;
app.use('/poi-images', express.static(isVercelEnv ? '/tmp' : path.join(__dirname, 'public', 'poi-images')));
app.use('/maps',       express.static(isVercelEnv ? '/tmp' : path.join(__dirname, 'public', 'maps')));

// Ensure all /api responses always have JSON Content-Type
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

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
      CREATE TABLE IF NOT EXISTS ap_projects (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        logo_url VARCHAR(500),
        public_slug VARCHAR(255) UNIQUE,
        project_type VARCHAR(50) DEFAULT 'Airport',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Safely attempt to add columns if they don't exist
    try {
      await conn.execute("ALTER TABLE ap_projects ADD COLUMN public_slug VARCHAR(255) UNIQUE");
    } catch (e) {}
    try {
      await conn.execute("ALTER TABLE ap_projects ADD COLUMN project_type VARCHAR(50) DEFAULT 'Airport'");
    } catch (e) {}

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        project_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Safely attempt to add the 'status' column if it doesn't exist (for existing DBs)
    try {
      await conn.execute("ALTER TABLE ap_users ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
    } catch (e) {
      // Ignored if column already exists (Error 1060)
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_floors (
        id         VARCHAR(100) PRIMARY KEY,
        project_id VARCHAR(100) DEFAULT 'default',
        building_id VARCHAR(100) DEFAULT 'bldg_default',
        level      VARCHAR(20)  NOT NULL,
        name       VARCHAR(100) NOT NULL,
        image      VARCHAR(255),
        sort_order INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Safely attempt to add 'building_id' for existing DBs
    try {
      await conn.execute("ALTER TABLE ap_floors ADD COLUMN building_id VARCHAR(100) DEFAULT 'bldg_default'");
    } catch (e) {
      // Ignored if column already exists
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_nodes (
        id          VARCHAR(200) PRIMARY KEY,
        project_id  VARCHAR(100) DEFAULT 'default',
        floor       VARCHAR(100) NOT NULL,
        x           FLOAT        NOT NULL,
        y           FLOAT        NOT NULL,
        name        VARCHAR(200) NOT NULL,
        category    VARCHAR(100),
        type        VARCHAR(100),
        description TEXT,
        status      VARCHAR(100) DEFAULT 'Open',
        image_url   LONGTEXT,
        is_custom   TINYINT(1)   DEFAULT 1,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_floor (floor),
        INDEX idx_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await conn.execute('ALTER TABLE ap_nodes MODIFY COLUMN image_url LONGTEXT');
    } catch (e) {
      // Ignored if column doesn't exist or already modified
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_edges (
        id            VARCHAR(300) PRIMARY KEY,
        project_id    VARCHAR(100) DEFAULT 'default',
        \`from\`        VARCHAR(200) NOT NULL,
        \`to\`          VARCHAR(200) NOT NULL,
        distance      FLOAT        DEFAULT 0,
        bidirectional TINYINT(1)   DEFAULT 1,
        \`accessible\`    TINYINT(1)   DEFAULT 1,
        blocked       TINYINT(1)   DEFAULT 0,
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_from (\`from\`),
        INDEX idx_to   (\`to\`),
        INDEX idx_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_categories (
        id         VARCHAR(100) PRIMARY KEY,
        project_id VARCHAR(100) DEFAULT 'default',
        name       VARCHAR(100) NOT NULL,
        icon       VARCHAR(20),
        color      VARCHAR(20),
        sort_order INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_custom_routes (
        id         VARCHAR(200) PRIMARY KEY,
        project_id VARCHAR(100) DEFAULT 'default',
        name       VARCHAR(200),
        node_ids   LONGTEXT,
        distance   FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert Default Project if not exists
    await conn.execute(`
      INSERT IGNORE INTO ap_projects (id, name, logo_url) 
      VALUES ('default', 'Chennai Airport', null)
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ap_buildings (
        id VARCHAR(100) PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert Default Building
    await conn.execute(`
      INSERT IGNORE INTO ap_buildings (id, project_id, name) 
      VALUES ('bldg_default', 'default', 'Chennai Terminal 1')
    `);

    // Seed default categories if empty
    const [existingCats] = await conn.execute('SELECT count(*) as count FROM ap_categories');
    if (existingCats[0].count === 0) {
      const defaultCats = [
        { id: 'gate', name: 'Gates', icon: 'Plane', color: '#3b82f6' },
        { id: 'checkin', name: 'Check-in', icon: 'Briefcase', color: '#8b5cf6' },
        { id: 'security', name: 'Security', icon: 'Shield', color: '#ef4444' },
        { id: 'washroom', name: 'Washrooms', icon: 'Droplet', color: '#06b6d4' },
        { id: 'food', name: 'Food & Dining', icon: 'Coffee', color: '#f59e0b' },
        { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#10b981' }
      ];
      for (let i = 0; i < defaultCats.length; i++) {
        const cat = defaultCats[i];
        await conn.execute(
          'INSERT IGNORE INTO ap_categories (id, project_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.id, 'default', cat.name, cat.icon, cat.color, i]
        );
      }
    }

    // Create Super Admin if not exists
    const superHash = await bcrypt.hash('admin123', 10);
    await conn.execute(`
      INSERT IGNORE INTO ap_users (id, username, password_hash, role, project_id) 
      VALUES ('superadmin_1', 'admin', ?, 'superadmin', null)
    `, [superHash]);

    console.log('✅ Prefixed MySQL tables ready (Multi-Tenant)');
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

// ── AUTHENTICATION ─────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM ap_users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];

    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Account disabled. Please contact support.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role, project_id: user.project_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, project_id: user.project_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

const DEFAULT_CATEGORIES = {
  'Airport': [
    { id: 'c_gates', name: 'Gates', icon: 'Plane', color: '#3b82f6' },
    { id: 'c_security', name: 'Security', icon: 'Shield', color: '#ef4444' },
    { id: 'c_checkin', name: 'Check-in', icon: 'Briefcase', color: '#8b5cf6' },
    { id: 'c_washroom', name: 'Washrooms', icon: 'Droplet', color: '#06b6d4' },
    { id: 'c_food', name: 'Food & Dining', icon: 'Coffee', color: '#f59e0b' },
    { id: 'c_shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#10b981' },
    { id: 'c_baggage', name: 'Baggage Claim', icon: 'Archive', color: '#f97316' },
    { id: 'c_lounge', name: 'Lounges', icon: 'Wine', color: '#ec4899' },
    { id: 'c_atm', name: 'ATM', icon: 'Banknote', color: '#14b8a6' },
    { id: 'c_medical', name: 'Medical', icon: 'Stethoscope', color: '#dc2626' },
    { id: 'c_lift', name: 'Lifts', icon: 'ChevronsUp', color: '#64748b' },
    { id: 'c_escalator', name: 'Escalators', icon: 'TrendingUp', color: '#8b5cf6' },
    { id: 'c_emergency', name: 'Emergency Exit', icon: 'AlertTriangle', color: '#ef4444' }
  ],
  'Hospital': [
    { id: 'c_emergency', name: 'Emergency', icon: 'AlertTriangle', color: '#ef4444' },
    { id: 'c_opd', name: 'OPD', icon: 'Stethoscope', color: '#3b82f6' },
    { id: 'c_wards', name: 'Wards', icon: 'Bed', color: '#8b5cf6' },
    { id: 'c_pharmacy', name: 'Pharmacy', icon: 'Pill', color: '#10b981' },
    { id: 'c_lifts', name: 'Lifts', icon: 'ChevronsUp', color: '#64748b' },
    { id: 'c_washroom', name: 'Washrooms', icon: 'Droplet', color: '#06b6d4' }
  ],
  'Mall': [
    { id: 'c_shopping', name: 'Stores', icon: 'ShoppingBag', color: '#10b981' },
    { id: 'c_food', name: 'Food Court', icon: 'Pizza', color: '#f59e0b' },
    { id: 'c_washroom', name: 'Washrooms', icon: 'Droplet', color: '#06b6d4' },
    { id: 'c_lifts', name: 'Lifts', icon: 'ChevronsUp', color: '#64748b' },
    { id: 'c_escalator', name: 'Escalators', icon: 'TrendingUp', color: '#8b5cf6' },
    { id: 'c_parking', name: 'Parking', icon: 'Car', color: '#3b82f6' }
  ],
  'Metro': [
    { id: 'c_platforms', name: 'Platforms', icon: 'Train', color: '#3b82f6' },
    { id: 'c_tickets', name: 'Ticketing', icon: 'Ticket', color: '#f59e0b' },
    { id: 'c_exits', name: 'Exits', icon: 'LogOut', color: '#ef4444' },
    { id: 'c_washroom', name: 'Washrooms', icon: 'Droplet', color: '#06b6d4' },
    { id: 'c_escalator', name: 'Escalators', icon: 'TrendingUp', color: '#8b5cf6' }
  ],
  'Exhibition': [
    { id: 'c_halls', name: 'Exhibition Halls', icon: 'Layout', color: '#3b82f6' },
    { id: 'c_stalls', name: 'Stalls', icon: 'Store', color: '#10b981' },
    { id: 'c_food', name: 'Food Court', icon: 'Coffee', color: '#f59e0b' },
    { id: 'c_exits', name: 'Exits', icon: 'LogOut', color: '#ef4444' },
    { id: 'c_washroom', name: 'Restrooms', icon: 'Droplet', color: '#06b6d4' }
  ],
  'University': [
    { id: 'c_class', name: 'Classrooms', icon: 'BookOpen', color: '#3b82f6' },
    { id: 'c_labs', name: 'Laboratories', icon: 'FlaskConical', color: '#8b5cf6' },
    { id: 'c_library', name: 'Library', icon: 'Library', color: '#10b981' },
    { id: 'c_cafeteria', name: 'Cafeteria', icon: 'Coffee', color: '#f59e0b' },
    { id: 'c_admin', name: 'Admin', icon: 'Building', color: '#64748b' },
    { id: 'c_washroom', name: 'Restrooms', icon: 'Droplet', color: '#06b6d4' }
  ],
  'Generic': [
    { id: 'c_rooms', name: 'Rooms', icon: 'DoorOpen', color: '#3b82f6' },
    { id: 'c_amenities', name: 'Amenities', icon: 'Star', color: '#f59e0b' },
    { id: 'c_washroom', name: 'Restrooms', icon: 'Droplet', color: '#06b6d4' },
    { id: 'c_lifts', name: 'Lifts/Stairs', icon: 'ChevronsUp', color: '#64748b' }
  ]
};

app.post('/api/superadmin/create-client', verifyToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  
  const { username, password, project_id, project_name, project_type = 'Airport' } = req.body;
  if (!username || !password || !project_id || !project_name) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Create Project
    await conn.execute(
      'INSERT INTO ap_projects (id, name, project_type) VALUES (?, ?, ?)',
      [project_id, project_name, project_type]
    );

    // Create User
    const hash = await bcrypt.hash(password, 10);
    const userId = `client_${Date.now()}`;
    await conn.execute(
      'INSERT INTO ap_users (id, username, password_hash, role, project_id) VALUES (?, ?, ?, ?, ?)',
      [userId, username, hash, 'client', project_id]
    );

    // Seed Categories
    const categoriesToSeed = DEFAULT_CATEGORIES[project_type] || DEFAULT_CATEGORIES['Generic'];
    for (let i = 0; i < categoriesToSeed.length; i++) {
      const cat = categoriesToSeed[i];
      await conn.execute(
        'INSERT INTO ap_categories (id, project_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [`${project_id}_${cat.id}`, project_id, cat.name, cat.icon, cat.color, i]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or Project ID already exists' });
    }
    // Return 400 instead of 500 to prevent shared hosting from replacing the JSON with an HTML error page
    res.status(400).json({ error: `Server Error: ${err.message}` });
  } finally {
    conn.release();
  }
});

// GET list of clients
app.get('/api/superadmin/list-clients', verifyToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const [rows] = await pool.execute(`
      SELECT u.id as user_id, u.username, u.status, u.created_at, p.id as project_id, p.name as project_name 
      FROM ap_users u 
      LEFT JOIN ap_projects p ON u.project_id = p.id 
      WHERE u.role = 'client'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE client status
app.put('/api/superadmin/client/:id/status', verifyToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  try {
    await pool.execute('UPDATE ap_users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE client and ALL their project data permanently
app.delete('/api/superadmin/client/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const userId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // 1. Get the project_id associated with this user
    const [users] = await conn.execute('SELECT project_id FROM ap_users WHERE id = ?', [userId]);
    if (users.length > 0) {
      const projectId = users[0].project_id;
      // 2. Cascade delete project data manually
      await conn.execute('DELETE FROM ap_floors WHERE project_id = ?', [projectId]);
      await conn.execute('DELETE FROM ap_nodes WHERE project_id = ?', [projectId]);
      await conn.execute('DELETE FROM ap_edges WHERE project_id = ?', [projectId]);
      await conn.execute('DELETE FROM ap_custom_routes WHERE project_id = ?', [projectId]);
      await conn.execute('DELETE FROM ap_categories WHERE project_id = ?', [projectId]);
      await conn.execute('DELETE FROM ap_buildings WHERE project_id = ?', [projectId]);
      await conn.execute('DELETE FROM ap_projects WHERE id = ?', [projectId]);
    }
    // 3. Delete the user
    await conn.execute('DELETE FROM ap_users WHERE id = ?', [userId]);
    
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET platform stats
app.get('/api/superadmin/stats', verifyToken, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const [[{ total_clients }]] = await pool.execute("SELECT COUNT(*) as total_clients FROM ap_users WHERE role='client'");
    const [[{ total_projects }]] = await pool.execute("SELECT COUNT(*) as total_projects FROM ap_projects");
    const [[{ total_floors }]] = await pool.execute("SELECT COUNT(*) as total_floors FROM ap_floors");
    const [[{ total_pois }]] = await pool.execute("SELECT COUNT(*) as total_pois FROM ap_nodes");
    
    res.json({ total_clients, total_projects, total_floors, total_pois });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to resolve project ID from ID or public slug
const resolveProjectId = async (identifier) => {
  if (!identifier || identifier === 'default') return 'default';
  const [rows] = await pool.execute('SELECT id FROM ap_projects WHERE id = ? OR public_slug = ?', [identifier, identifier]);
  return rows.length > 0 ? rows[0].id : identifier;
};

// ── SETTINGS / PROJECT ────────────────────────────────────────────────────────
app.get('/api/load-settings', async (req, res) => {
  try {
    const projectId = await resolveProjectId(req.query.project);
    const [rows] = await pool.execute('SELECT id, name, logo_url, public_slug FROM ap_projects WHERE id = ?', [projectId]);
    if (rows.length === 0) return res.json({ id: projectId, name: 'Airport Indoor Map', logo_url: null, public_slug: null });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-settings', verifyToken, async (req, res) => {
  const { name, logo_url, public_slug } = req.body;
  const projectId = req.user.project_id || 'default';
  const slugToSave = public_slug && public_slug.trim() !== '' ? public_slug.trim() : null;
  try {
    await pool.execute(
      'UPDATE ap_projects SET name = ?, logo_url = ?, public_slug = ? WHERE id = ?',
      [name, logo_url, slugToSave, projectId]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'That public URL is already taken by another project.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── CATEGORIES ─────────────────────────────────────────────────────────────────
app.get('/api/load-categories', async (req, res) => {
  try {
    const projectId = await resolveProjectId(req.query.project);
    const [rows] = await pool.execute('SELECT id, name, icon, color, sort_order FROM ap_categories WHERE project_id = ? ORDER BY sort_order ASC', [projectId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-categories', verifyToken, async (req, res) => {
  const categories = req.body; // Expecting an array of categories
  const projectId = req.user.project_id || 'default';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Delete all existing categories for project
    await conn.execute('DELETE FROM ap_categories WHERE project_id = ?', [projectId]);
    
    // Insert new ones
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      await conn.execute(
        'INSERT INTO ap_categories (id, project_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, projectId, c.name, c.icon, c.color, i]
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

// ── BUILDINGS ──────────────────────────────────────────────────────────────────
app.get('/api/load-buildings', async (req, res) => {
  try {
    const projectId = await resolveProjectId(req.query.project);
    const [rows] = await pool.execute('SELECT id, name, description FROM ap_buildings WHERE project_id = ? ORDER BY created_at ASC', [projectId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-buildings', verifyToken, async (req, res) => {
  const buildings = req.body;
  const projectId = req.user.project_id || 'default';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Get existing buildings to detect deletions
    const [existing] = await conn.execute('SELECT id FROM ap_buildings WHERE project_id = ?', [projectId]);
    const existingIds = existing.map(b => b.id);
    const newIds = buildings.map(b => b.id);
    const idsToDelete = existingIds.filter(id => !newIds.includes(id));

    // Delete buildings (and their floors cascade? For now, just delete buildings)
    if (idsToDelete.length > 0) {
      for (const delId of idsToDelete) {
        await conn.execute('DELETE FROM ap_floors WHERE building_id = ? AND project_id = ?', [delId, projectId]);
        await conn.execute('DELETE FROM ap_buildings WHERE id = ? AND project_id = ?', [delId, projectId]);
      }
    }

    // Upsert buildings
    for (const b of buildings) {
      await conn.execute(
        'INSERT INTO ap_buildings (id, project_id, name, description) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name = ?, description = ?',
        [b.id, projectId, b.name, b.description || null, b.name, b.description || null]
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

// ── FLOORS ─────────────────────────────────────────────────────────────────────
app.get('/api/load-floors', async (req, res) => {
  try {
    const projectId = await resolveProjectId(req.query.project);
    const buildingId = req.query.building || 'bldg_default'; // default fallback for safety
    const [rows] = await pool.execute('SELECT id, building_id, level, name, image FROM ap_floors WHERE project_id = ? AND building_id = ? ORDER BY sort_order', [projectId, buildingId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-floors', verifyToken, async (req, res) => {
  const { floors, buildingId } = req.body;
  if (!buildingId) return res.status(400).json({ error: 'buildingId is required' });
  const projectId = req.user.project_id || 'default';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Delete removed floors for this building
    if (floors.length > 0) {
      const ph = floors.map(() => '?').join(',');
      const ids = floors.map(f => f.id);
      await conn.execute(`DELETE FROM ap_floors WHERE project_id = ? AND building_id = ? AND id NOT IN (${ph})`, [projectId, buildingId, ...ids]);
    } else {
      await conn.execute('DELETE FROM ap_floors WHERE project_id = ? AND building_id = ?', [projectId, buildingId]);
    }

    // 2. Upsert floors
    for (let i = 0; i < floors.length; i++) {
      const f = floors[i];
      if (f.image === '__KEEP__') {
        await conn.execute(
          'UPDATE ap_floors SET level=?, name=?, sort_order=? WHERE id=? AND project_id=? AND building_id=?',
          [f.level, f.name, i, f.id, projectId, buildingId]
        );
      } else {
        await conn.execute(
          `INSERT INTO ap_floors (id, project_id, building_id, level, name, image, sort_order) 
           VALUES (?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE level=VALUES(level), name=VALUES(name), image=VALUES(image), sort_order=VALUES(sort_order)`,
          [f.id, projectId, buildingId, f.level, f.name, f.image || null, i]
        );
      }
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
    const projectId = await resolveProjectId(req.query.project);
    const [nodes] = await pool.execute(
      'SELECT id, floor, x, y, name, category, type, description, status, image_url AS imageUrl, is_custom AS isCustom FROM ap_nodes WHERE project_id = ?',
      [projectId]
    );
    const [edges] = await pool.execute(
      'SELECT id, `from`, `to`, distance, bidirectional, `accessible`, blocked FROM ap_edges WHERE project_id = ?',
      [projectId]
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

app.post('/api/save-graph', verifyToken, async (req, res) => {
  const { nodes = [], edges = [] } = req.body;
  const projectId = req.user.project_id || 'default';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Upsert nodes
    for (const n of nodes) {
      await conn.execute(`
        INSERT INTO ap_nodes (id, project_id, floor, x, y, name, category, type, description, status, image_url, is_custom)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          floor=VALUES(floor), x=VALUES(x), y=VALUES(y), name=VALUES(name),
          category=VALUES(category), type=VALUES(type), description=VALUES(description),
          status=VALUES(status), image_url=VALUES(image_url), is_custom=VALUES(is_custom)
      `, [
        n.id, projectId, n.floor, n.x, n.y, n.name,
        n.category||null, n.type||null, n.description||'',
        n.status||'Open', n.imageUrl||null, n.isCustom ? 1 : 0
      ]);
    }
    // Delete removed nodes
    if (nodes.length > 0) {
      const ph = nodes.map(() => '?').join(',');
      await conn.execute(`DELETE FROM ap_nodes WHERE project_id = ? AND id NOT IN (${ph})`, [projectId, ...nodes.map(n => n.id)]);
    } else {
      await conn.execute('DELETE FROM ap_nodes WHERE project_id = ?', [projectId]);
    }

    // Upsert edges
    for (const e of edges) {
      await conn.execute(`
        INSERT INTO ap_edges (id, project_id, \`from\`, \`to\`, distance, bidirectional, \`accessible\`, blocked)
        VALUES (?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          \`from\`=VALUES(\`from\`), \`to\`=VALUES(\`to\`), distance=VALUES(distance),
          bidirectional=VALUES(bidirectional), \`accessible\`=VALUES(\`accessible\`), blocked=VALUES(blocked)
      `, [
        e.id, projectId, e.from, e.to, e.distance||0,
        e.bidirectional !== false ? 1 : 0,
        e.accessible    !== false ? 1 : 0,
        e.blocked ? 1 : 0
      ]);
    }
    // Delete removed edges
    if (edges.length > 0) {
      const ph = edges.map(() => '?').join(',');
      await conn.execute(`DELETE FROM ap_edges WHERE project_id = ? AND id NOT IN (${ph})`, [projectId, ...edges.map(e => e.id)]);
    } else {
      await conn.execute('DELETE FROM ap_edges WHERE project_id = ?', [projectId]);
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
  const projectId = req.query.project || 'default';
  try {
    const [rows] = await pool.execute('SELECT * FROM ap_custom_routes WHERE project_id = ?', [projectId]);
    res.json(rows.map(r => ({ ...r, node_ids: JSON.parse(r.node_ids || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-routes', verifyToken, async (req, res) => {
  const routes = Array.isArray(req.body) ? req.body : [];
  const projectId = req.user.project_id || 'default';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM ap_custom_routes WHERE project_id = ?', [projectId]);
    for (const r of routes) {
      await conn.execute(
        'INSERT INTO ap_custom_routes (id, project_id, name, node_ids, distance) VALUES (?,?,?,?,?)',
        [r.id, projectId, r.name||'', JSON.stringify(r.node_ids||[]), r.distance||0]
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

// ── IMAGE UPLOAD (Memory → Base64 → MySQL) ─────────────────────────────────────
// Using memory storage so images are NEVER written to disk.
// This works on Vercel serverless, local, and any other platform.
// Images are returned as base64 data URLs and stored directly in MySQL (LONGTEXT).
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB max
});

app.post('/api/upload-poi-image', verifyToken, uploadMiddleware.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  res.json({ url: base64 });
});

app.post('/api/upload-floor-map', verifyToken, uploadMiddleware.single('map'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  res.json({ url: base64 });
});

app.post('/api/upload-logo', verifyToken, uploadMiddleware.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  res.json({ url: base64 });
});

// ── Global JSON Error Handler (must be LAST middleware, BEFORE catch-all) ──────
app.use('/api', (err, req, res, next) => {
  console.error('[API Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'An internal server error occurred.' });
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
  // On Vercel, DB init failure should not crash the whole process
  // — individual routes will handle DB errors gracefully
  console.error('⚠️ DB init warning (non-fatal on serverless):', err.message);
  if (require.main === module) {
    process.exit(1);
  }
});

module.exports = app;
