require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 16) {
  console.error('JWT_SECRET is missing or too short. Set it in SOCKET_SERVER/.env (same value as HTTP_SERVER).');
  process.exit(1);
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(s => s.trim()).filter(Boolean);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'ok' }));
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, { cors: { origin: allowedOrigins } });

// Only clients holding a valid login token (issued by HTTP_SERVER) may connect.
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Missing token'));
  try {
    const payload = jwt.verify(token, secret);
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { userId, role } = socket.data;
  console.log(`Client connected: ${socket.id} (user ${userId}, ${role})`);

  // Private room per user: later used to push messages / notifications to one person.
  socket.join(`user:${userId}`);
  socket.emit('connected', { userId });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});
