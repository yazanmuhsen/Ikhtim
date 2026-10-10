const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send initial welcome message
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to Khitmah live updates' }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (e) {
        // ignore non-json
      }
    });

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err.message);
    });
  });

  // Heartbeat interval to clean dead connections
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('WebSocket server mounted at /ws');
  return wss;
}

function broadcast(type, data = {}) {
  if (!wss) return;
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcast
};
