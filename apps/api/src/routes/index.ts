import { Express } from 'express';
import { Server } from 'socket.io';
import authRoutes from './auth';
import organizationRoutes from './organizations';
import pageRoutes from './pages';
import broadcastRoutes from './broadcasts';
import commentRoutes from './comments';
import webhookRoutes from './webhooks';
import analyticsRoutes from './analytics';
import subscriptionRoutes from './subscriptions';

export const setupRoutes = (app: Express, io: Server) => {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/pages', pageRoutes);
  app.use('/api/broadcasts', broadcastRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  
  // Webhook routes (no auth required)
  app.use('/api/webhooks', webhookRoutes);

  // Socket.io setup
  io.on('connection', (socket) => {
    socket.on('join-organization', (organizationId: string) => {
      socket.join(`org:${organizationId}`);
    });

    socket.on('leave-organization', (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
    });

    socket.on('disconnect', () => {
      // Clean up
    });
  });
};