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
  
  // Wipe the categories we just made
  await pool.execute('DELETE FROM ap_categories WHERE project_id = ?', ['default']);
  
  const categoriesToSeed = [
    { id: 'gate', name: 'Gates', icon: 'Plane', color: '#3b82f6' },
    { id: 'security', name: 'Security', icon: 'Shield', color: '#ef4444' },
    { id: 'checkin', name: 'Check-in', icon: 'Briefcase', color: '#8b5cf6' },
    { id: 'washroom', name: 'Washrooms', icon: 'Droplet', color: '#06b6d4' },
    { id: 'restaurant', name: 'Food & Dining', icon: 'Coffee', color: '#f59e0b' },
    { id: 'cafe', name: 'Cafe', icon: 'Coffee', color: '#f59e0b' },
    { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#10b981' },
    { id: 'baggage', name: 'Baggage', icon: 'Archive', color: '#f97316' },
    { id: 'lounge', name: 'Lounges', icon: 'Wine', color: '#ec4899' },
    { id: 'atm', name: 'ATM', icon: 'Banknote', color: '#14b8a6' },
    { id: 'medical', name: 'Medical', icon: 'Stethoscope', color: '#dc2626' },
    { id: 'lift', name: 'Lifts', icon: 'ChevronsUp', color: '#64748b' },
    { id: 'escalator', name: 'Escalators', icon: 'TrendingUp', color: '#8b5cf6' },
    { id: 'prayer', name: 'Prayer Room', icon: 'Heart', color: '#10b981' },
    { id: 'emergency', name: 'Emergency', icon: 'AlertTriangle', color: '#ef4444' }
  ];

  for (let i = 0; i < categoriesToSeed.length; i++) {
    const cat = categoriesToSeed[i];
    await pool.execute(
      'INSERT INTO ap_categories (id, project_id, name, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [cat.id, 'default', cat.name, cat.icon, cat.color, i]
    );
  }
  
  console.log('Fixed default categories to match existing POIs!');
  process.exit(0);
}
run();
