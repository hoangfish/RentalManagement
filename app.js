require('dotenv').config();
require('colors');
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const DBConnection = require('./Apps/config/db');
const { getSecret } = require('./Apps/middlewares/auth');
const { AppError } = require('./Apps/common/errors');
const userRoutes = require('./Apps/routes/UserRoute');
const roomRoutes = require('./Apps/routes/RoomRoute');
const { UPLOAD_DIR } = require('./Apps/config/storage');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(s => s.trim()).filter(Boolean);

app.use(compression());
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

const versionOne = (routeName) => `/api/v1/${routeName}`;

app.get(versionOne('health'), (req, res) => res.json({ success: true, message: 'ok' }));
// Room photos. The client runs on another origin, so images must be allowed cross-origin.
app.use('/uploads', express.static(UPLOAD_DIR, {
    maxAge: '7d',
    immutable: true,
    index: false,
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

app.use(versionOne('users'), userRoutes);
app.use(versionOne('rooms'), roomRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
});

app.use((err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.status).json({ success: false, message: err.message, ...(err.errors && { errors: err.errors }) });
    }
    if (err.name === 'MulterError') {
        const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 10 MB'
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'You can upload at most 20 photos'
            : 'Upload failed';
        return res.status(400).json({ success: false, message, errors: { photos: message } });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }
    console.error('Server error:'.red, err);
    res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 3000;

async function start() {
    getSecret(); // throws a clear error if JWT_SECRET is not configured
    await DBConnection();
    const server = http.createServer(app);
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`.cyan);
    });
}

start().catch((err) => {
    console.error('Could not start the server:'.red, err.message);
    process.exit(1);
});
