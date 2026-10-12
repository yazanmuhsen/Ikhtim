const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const { initDb, closeDb } = require('./db');
const { setupWebSocket } = require('./websocket');
const { router: juzRoutes } = require('./routes/juz');
const { router: khitmahRoutes } = require('./routes/khitmahs');
const { router: statsRouter } = require('./routes/stats');

// existing routes
app.use('/api/juz', juzRoutes);
app.use('/api/k', khitmahRoutes);
app.use('/api/stats', statsRouter); // new stats endpoint

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend Vite dev server and standard origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-manage-token', 'x-admin-token']
}));

app.use(express.json());

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Khitmah API', time: new Date() });
});

// API Routes
app.use('/api/juz', juzRoutes);
app.use('/api/k', khitmahRoutes);

// Serve static frontend build if present
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Setup WebSockets
setupWebSocket(server);

async function startServer() {
  await initDb();
  const port = Number(process.env.PORT) || 5000;
  await new Promise((resolve, reject) => {
    const onError = (err) => reject(err);
    server.once('error', onError);
    server.listen(port, () => {
      server.removeListener('error', onError);
      console.log(`🌟 Khitmah Backend running on http://localhost:${port}`);
      console.log(`📡 WebSocket server ready at ws://localhost:${port}/ws`);
      resolve();
    });
  });
}

async function stopServer() {
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
  await closeDb();
}

// Graceful cleanup on exit
process.on('SIGTERM', () => {
  server.close();
});

if (require.main === module) {
  startServer()
    .then(async () => {
      // Warm the Quran cache in the background so readers don't wait
      const { getJuzPages } = require('./quranService');
      for (let i = 1; i <= 30; i++) {
        try { await getJuzPages(i); } catch (e) { console.warn(`Cache warm failed for Juz ${i}:`, e.message); }
      }
      console.log('Quran cache warmed for all 30 juz.');
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = { app, server, startServer, stopServer };
