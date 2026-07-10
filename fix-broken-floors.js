const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });

  // Show all floors and their image status
  const [rows] = await c.execute('SELECT id, name, level, building_id, image FROM ap_floors');
  const fs = require('fs');
  
  const broken = [];
  for (const f of rows) {
    if (!f.image) continue;
    // Check if image is a path (not base64)
    if (f.image.startsWith('/maps/') || f.image.startsWith('/poi-images/')) {
      const filename = f.image.split('/').pop();
      const exists = fs.existsSync(`public/maps/${filename}`) || fs.existsSync(`public/poi-images/${filename}`);
      if (!exists) {
        broken.push(f);
        console.log(`BROKEN: ${f.id} | ${f.level} | ${f.name} | ${f.image}`);
      } else {
        console.log(`OK:     ${f.id} | ${f.level} | ${f.name} | ${f.image}`);
      }
    } else {
      console.log(`OK:     ${f.id} | ${f.level} | ${f.name} | [base64 data]`);
    }
  }

  if (broken.length > 0) {
    console.log(`\nClearing ${broken.length} broken image paths...`);
    for (const f of broken) {
      await c.execute('UPDATE ap_floors SET image = NULL WHERE id = ?', [f.id]);
    }
    console.log('Done! These floors now have no image. Please re-upload.');
  } else {
    console.log('\nAll floor images are OK!');
  }

  c.end();
}

fix().catch(console.error);
