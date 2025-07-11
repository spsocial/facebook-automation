import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

import passport from './config/passport';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { setupRoutes } from './routes';
import { initializeQueues } from './services/queue';
import { initializeScheduler } from './services/scheduler';
import { logger } from './utils/logger';
import { setSocketServer } from './utils/socketManager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Set the socket server for use in other modules
setSocketServer(io);

// Global middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(requestLogger);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup routes
setupRoutes(app, io);

// Error handling
app.use(errorHandler);

// Initialize services
const startServer = async () => {
  try {
    // Initialize queues
    try {
      await initializeQueues();
      logger.info('✅ Queues initialized');
    } catch (error) {
      logger.warn('⚠️  Queues initialization failed (Redis might not be running):', error);
      logger.info('Continuing without queue support...');
    }

    // Initialize scheduler
    try {
      await initializeScheduler();
      logger.info('✅ Scheduler initialized');
    } catch (error) {
      logger.warn('⚠️  Scheduler initialization failed:', error);
      logger.info('Continuing without scheduler support...');
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

export { app, io };