import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { connectDB } from './config/db';
import apiRoutes from './routes';
import { setupSocketHandlers } from './socket';
import { sessionService } from './services';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// --- Middleware ---
app.use(helmet());
app.use(
  cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','), credentials: true })
);
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// --- Routes ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api', apiRoutes);

// --- Socket.io ---
setupSocketHandlers(io);

// --- Session cleanup (every 5 minutes) ---
setInterval(
  async () => {
    const cleaned = await sessionService.cleanupStaleSessions();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale sessions`);
    }
  },
  5 * 60 * 1000
);

// --- Start Server ---
async function start() {
  await connectDB();

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 DropZone server running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   WebSocket:   ws://localhost:${env.PORT}`);
  });
}

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
