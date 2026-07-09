import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
function savePoisPlugin() {
  return {
    name: 'save-pois-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const dataDir = path.resolve(__dirname, 'src/assets/data');

        if (req.url === '/api/load-floors' && req.method === 'GET') {
          try {
            const floorsFile = path.join(dataDir, 'floors.json');
            if (fs.existsSync(floorsFile)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(floorsFile, 'utf-8'));
            } else {
              const defaultFloors = [
                { id: 'arrival', level: 'L1', name: 'Arrival', image: '/maps/arrival.jpg' },
                { id: 'departure', level: 'L2', name: 'Departure', image: '/maps/departure.jpg' },
                { id: 'mezzanine', level: 'L3', name: 'Mezzanine', image: '/maps/mezzanine.jpg' },
                { id: 'lounge', level: 'L4', name: 'Lounge', image: '/maps/lounge.jpg' }
              ];
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(floorsFile, JSON.stringify(defaultFloors, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(defaultFloors));
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (req.url === '/api/save-floors' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const floors = JSON.parse(body);
              fs.writeFileSync(path.join(dataDir, 'floors.json'), JSON.stringify(floors, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.url === '/api/load-graph' && req.method === 'GET') {
          try {
            const graphFile = path.join(dataDir, 'graph.json');
            if (fs.existsSync(graphFile)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(graphFile, 'utf-8'));
            } else {
              const poisFile = path.join(dataDir, 'pois.json');
              let initialNodes = [];
              if (fs.existsSync(poisFile)) {
                try {
                  const poisData = JSON.parse(fs.readFileSync(poisFile, 'utf-8'));
                  Object.keys(poisData).forEach(floorKey => {
                    if (Array.isArray(poisData[floorKey])) {
                      poisData[floorKey].forEach(poi => {
                        initialNodes.push({
                          id: poi.id,
                          name: poi.name,
                          category: poi.category || 'gate',
                          type: poi.category || 'gate',
                          x: poi.x,
                          y: poi.y,
                          floor: poi.floor || floorKey,
                          description: poi.description || '',
                          status: poi.status || 'Open',
                          imageUrl: poi.imageUrl || null,
                          isCustom: poi.isCustom !== false
                        });
                      });
                    }
                  });
                } catch (e) {
                  console.error('POI migration failed', e);
                }
              }
              const defaultGraph = {
                nodes: initialNodes,
                edges: []
              };
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(graphFile, JSON.stringify(defaultGraph, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(defaultGraph));
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (req.url === '/api/save-graph' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const graph = JSON.parse(body);
              fs.writeFileSync(path.join(dataDir, 'graph.json'), JSON.stringify(graph, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.url === '/api/load-pois' && req.method === 'GET') {
          try {
            const poisFile = path.join(dataDir, 'pois.json');
            if (fs.existsSync(poisFile)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(poisFile, 'utf-8'));
            } else {
              // Migrate initial files
              const initialData = {};
              ['departure', 'arrival', 'mezzanine', 'lounge'].forEach(key => {
                const p = path.join(dataDir, `${key}.json`);
                if (fs.existsSync(p)) {
                  initialData[key] = JSON.parse(fs.readFileSync(p, 'utf-8'));
                } else {
                  initialData[key] = [];
                }
              });
              fs.writeFileSync(poisFile, JSON.stringify(initialData, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(initialData));
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (req.url === '/api/save-pois' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const pois = JSON.parse(body);
              fs.writeFileSync(path.join(dataDir, 'pois.json'), JSON.stringify(pois, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.url === '/api/upload-map' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { filename, base64 } = JSON.parse(body);
              const data = base64.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(data, 'base64');
              const mapsDir = path.resolve(__dirname, 'public/maps');
              
              if (!fs.existsSync(mapsDir)) {
                fs.mkdirSync(mapsDir, { recursive: true });
              }
              
              const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const filepath = path.join(mapsDir, safeFilename);
              fs.writeFileSync(filepath, buffer);
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, url: `/maps/${safeFilename}` }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.url === '/api/upload-image' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { filename, base64 } = JSON.parse(body);
              const data = base64.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(data, 'base64');
              const imageDir = path.resolve(__dirname, 'public/poi-images');
              
              if (!fs.existsSync(imageDir)) {
                fs.mkdirSync(imageDir, { recursive: true });
              }
              
              const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const filepath = path.join(imageDir, safeFilename);
              fs.writeFileSync(filepath, buffer);
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, url: `/poi-images/${safeFilename}` }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.url === '/api/save-routes' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const routes = JSON.parse(body);
              fs.writeFileSync(path.join(dataDir, 'custom_routes.json'), JSON.stringify(routes, null, 2));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.url === '/api/load-routes' && req.method === 'GET') {
          try {
            const filepath = path.join(dataDir, 'custom_routes.json');
            if (fs.existsSync(filepath)) {
              const file = fs.readFileSync(filepath, 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(file);
            } else {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end('{}');
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    savePoisPlugin()
  ],
  server: {
    watch: {
      ignored: ['**/src/assets/data/**']
    }
  }
})
