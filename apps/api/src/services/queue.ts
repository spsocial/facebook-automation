import Bull from 'bull';
import prisma from '@repo/database';
import { FacebookService } from './facebookService';
import { logger } from '../utils/logger';
import { getSocketServer } from '../utils/socketManager';
import { MockQueue } from './mockQueue';

let broadcastQueue: Bull.Queue | any = null;
let commentQueue: Bull.Queue | any = null;

const initQueues = () => {
  const useRedis = process.env.USE_REDIS !== 'false';
  
  if (!broadcastQueue) {
    if (useRedis) {
      try {
        broadcastQueue = new Bull('broadcast-queue', {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
        });
        logger.info('Redis broadcast queue initialized');
      } catch (error) {
        logger.warn('Failed to connect to Redis, using mock queue');
        broadcastQueue = new MockQueue('broadcast-queue');
      }
    } else {
      broadcastQueue = new MockQueue('broadcast-queue');
    }
  }
  
  if (!commentQueue) {
    if (useRedis) {
      try {
        commentQueue = new Bull('comment-queue', {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
        });
        logger.info('Redis comment queue initialized');
      } catch (error) {
        logger.warn('Failed to connect to Redis, using mock queue');
        commentQueue = new MockQueue('comment-queue');
      }
    } else {
      commentQueue = new MockQueue('comment-queue');
    }
  }
  
  return { broadcastQueue, commentQueue };
};

export const initializeQueues = async () => {
  const { broadcastQueue, commentQueue } = initQueues();
  
  // Broadcast queue processor
  broadcastQueue.process(async (job) => {
    logger.info(`Processing broadcast job ${job.id}`);
    const { broadcastId, organizationId } = job.data;

    try {
      // Get broadcast details
      const broadcast = await prisma.broadcast.findUnique({
        where: { id: broadcastId },
        include: { page: true },
      });

      if (!broadcast) {
        throw new Error('Broadcast not found');
      }

      if (broadcast.status !== 'scheduled' && broadcast.status !== 'sending') {
        logger.info(`Broadcast ${broadcastId} already processed or cancelled`);
        return;
      }

      // Update status to sending
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'sending' },
      });

      // Initialize Facebook service
      const fbService = new FacebookService(broadcast.page.pageAccessToken);

      // Prepare message
      const message: any = {};
      if (broadcast.messageText) {
        message.text = broadcast.messageText;
      }
      if (broadcast.messageAttachments && broadcast.messageAttachments.length > 0) {
        const attachment = broadcast.messageAttachments[0] as any;
        message.attachment = {
          type: attachment.type,
          payload: {
            url: attachment.url,
          },
        };
      }

      // Send to recipients
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as any[],
      };

      for (const recipientId of broadcast.recipientIds) {
        try {
          await fbService.sendMessage(recipientId, message, broadcast.page.pageAccessToken);
          results.sent++;
          
          // Emit progress update
          try {
            getSocketServer().to(`org:${organizationId}`).emit('broadcast-progress', {
              broadcastId,
              progress: Math.round((results.sent / broadcast.recipientIds.length) * 100),
            });
          } catch (socketError) {
            logger.debug('Socket.io not available for progress update');
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            recipientId,
            error: error.message,
          });
          logger.error(`Failed to send to ${recipientId}:`, error);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update broadcast with results
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          stats: {
            sent: results.sent,
            failed: results.failed,
            delivered: results.sent, // Will be updated by webhook
            read: 0, // Will be updated by webhook
          },
        },
      });

      // Update usage tracking
      const currentMonth = new Date().toISOString().slice(0, 7);
      await prisma.usageTracking.upsert({
        where: {
          organizationId_month: {
            organizationId,
            month: currentMonth,
          },
        },
        update: {
          broadcastsSent: {
            increment: 1,
          },
        },
        create: {
          organizationId,
          month: currentMonth,
          broadcastsSent: 1,
        },
      });

      // Emit completion
      try {
        getSocketServer().to(`org:${organizationId}`).emit('broadcast-complete', {
          broadcastId,
          results,
        });
      } catch (socketError) {
        logger.debug('Socket.io not available for completion update');
      }

      logger.info(`Broadcast ${broadcastId} completed: ${results.sent} sent, ${results.failed} failed`);
    } catch (error) {
      logger.error(`Broadcast job ${broadcastId} failed:`, error);
      
      // Update broadcast status
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: 'failed',
          stats: {
            sent: 0,
            failed: 0,
            delivered: 0,
            read: 0,
          },
        },
      });

      throw error;
    }
  });

  // Comment queue processor
  commentQueue.process(async (job) => {
    logger.info(`Processing comment job ${job.id}`);
    const { commentId, organizationId } = job.data;

    try {
      // Get comment details
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          post: {
            include: { page: true },
          },
        },
      });

      if (!comment || !comment.post) {
        throw new Error('Comment or post not found');
      }

      if (comment.isForwarded) {
        logger.info(`Comment ${commentId} already forwarded`);
        return;
      }

      // Initialize Facebook service
      const fbService = new FacebookService(comment.post.page.pageAccessToken);

      // Send message to commenter
      const message = {
        text: `ขอบคุณสำหรับความคิดเห็นของคุณ: "${comment.commentText}"\n\nเราจะติดต่อกลับโดยเร็วที่สุด!`,
      };

      if (comment.commenterId) {
        await fbService.sendMessage(
          comment.commenterId,
          message,
          comment.post.page.pageAccessToken
        );
      }

      // Update comment as forwarded
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          isForwarded: true,
          forwardedAt: new Date(),
        },
      });

      // Update usage tracking
      const currentMonth = new Date().toISOString().slice(0, 7);
      await prisma.usageTracking.upsert({
        where: {
          organizationId_month: {
            organizationId,
            month: currentMonth,
          },
        },
        update: {
          commentsProcessed: {
            increment: 1,
          },
        },
        create: {
          organizationId,
          month: currentMonth,
          commentsProcessed: 1,
        },
      });

      // Emit update
      try {
        getSocketServer().to(`org:${organizationId}`).emit('comment-forwarded', {
          commentId,
        });
      } catch (socketError) {
        logger.debug('Socket.io not available for comment update');
      }

      logger.info(`Comment ${commentId} forwarded successfully`);
    } catch (error) {
      logger.error(`Comment job ${commentId} failed:`, error);
      throw error;
    }
  });

  // Error handling
  broadcastQueue.on('failed', (job, err) => {
    logger.error(`Broadcast job ${job.id} failed:`, err);
  });

  commentQueue.on('failed', (job, err) => {
    logger.error(`Comment job ${job.id} failed:`, err);
  });
};

// Export getter functions for the queues
export const getBroadcastQueue = () => {
  if (!broadcastQueue) {
    throw new Error('Broadcast queue not initialized. Call initializeQueues() first.');
  }
  return broadcastQueue;
};

export const getCommentQueue = () => {
  if (!commentQueue) {
    throw new Error('Comment queue not initialized. Call initializeQueues() first.');
  }
  return commentQueue;
};