# Airport Indoor Map — MySQL Version

## 📁 Project Structure
```
airport-indoor-map-mysql/
├── server.js          ← Express + MySQL backend
├── migrate.js         ← JSON → MySQL import script
├── .env               ← Database credentials
├── package.json
├── src/               ← React frontend (same as JSON project)
├── public/            ← Images, maps
└── dist/              ← React build output (after npm run build)
```

## ⚙️ Setup Steps

### 1. MySQL mein database banao
```sql
CREATE DATABASE airport_map CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. .env file mein credentials daalo
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=apna_password
DB_NAME=airport_map
PORT=3000
```

### 3. Dependencies install karo
```bash
npm install
```

### 4. Data migrate karo (JSON → MySQL)
```bash
node migrate.js
```

### 5. Development mode (Vite dev server)
```bash
npm run dev
```

### 6. Production mode
```bash
npm run build
node server.js
```

## 🗄️ MySQL Tables

| Table | Data |
|---|---|
| `floors` | Floor list |
| `nodes` | Gates, Shops, Waypoints |
| `edges` | Path connections |
| `categories` | Category list |
| `custom_routes` | Admin routes |

## 🌐 Live Hosting (VPS)
```bash
npm run build
pm2 start server.js --name "airport-map"
```
