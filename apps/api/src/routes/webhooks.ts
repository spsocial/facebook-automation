import { Router, Request, Response } from 'express';
import prisma from '@repo/database';
import { getCommentQueue } from '../services/queue';
import { logger } from '../utils/logger';
import { io } from '../index';

const router = Router();

// Facebook webhook verification
router.get('/facebook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      logger.info('Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Facebook webhook events
router.post('/facebook', async (req: Request, res: Response) => {
  try {
    const { body } = req;
    
    // Facebook can send multiple entries
    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id;
        
        // Handle different change types
        for (const change of entry.changes || []) {
          await handleWebhookChange(pageId, change);
        }

        // Handle messaging events
        for (const event of entry.messaging || []) {
          await handleMessagingEvent(pageId, event);
        }
      }
    }

    // Always respond quickly to Facebook
    res.sendStatus(200);
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.sendStatus(200); // Still respond 200 to avoid retries
  }
});

async function handleWebhookChange(pageId: string, change: any) {
  try {
    logger.info(`Webhook change: ${change.field}`, { pageId, change });

    if (change.field === 'feed' && change.value.item === 'comment') {
      // New comment on a post
      const comment = {
        commentId: change.value.comment_id,
        postId: change.value.post_id,
        senderId: change.value.sender_id,
        senderName: change.value.sender_name,
        message: change.value.message,
        createdTime: new Date(change.value.created_time * 1000),
        parentId: change.value.parent_id,
      };

      await processNewComment(pageId, comment);
    } else if (change.field === 'feed' && change.value.item === 'post') {
      // New post created
      logger.info('New post created', { pageId, postId: change.value.post_id });
    }
  } catch (error) {
    logger.error('Error handling webhook change:', error);
  }
}

async function handleMessagingEvent(pageId: string, event: any) {
  try {
    logger.info(`Messaging event: ${event.message ? 'message' : 'other'}`, { pageId });

    if (event.message && !event.message.is_echo) {
      // Incoming message from user
      // This could be used to track message reads, delivery, etc.
      logger.info('Incoming message', {
        pageId,
        senderId: event.sender.id,
        messageId: event.message.mid,
      });
    } else if (event.delivery) {
      // Message delivery confirmation
      await handleDeliveryEvent(pageId, event.delivery);
    } else if (event.read) {
      // Message read confirmation
      await handleReadEvent(pageId, event.read);
    }
  } catch (error) {
    logger.error('Error handling messaging event:', error);
  }
}

async function processNewComment(pageId: string, commentData: any) {
  try {
    // Find the Facebook page
    const page = await prisma.facebookPage.findFirst({
      where: {
        pageId,
        isActive: true,
      },
    });

    if (!page) {
      logger.warn(`Page ${pageId} not found or inactive`);
      return;
    }

    // Check if we're monitoring this post
    const monitoredPost = await prisma.monitoredPost.findFirst({
      where: {
        postId: commentData.postId,
        organizationId: page.organizationId,
        isActive: true,
      },
    });

    if (!monitoredPost) {
      logger.debug(`Post ${commentData.postId} is not being monitored`);
      return;
    }

    // Check if comment already exists
    const existingComment = await prisma.comment.findUnique({
      where: { commentId: commentData.commentId },
    });

    if (existingComment) {
      logger.debug(`Comment ${commentData.commentId} already exists`);
      return;
    }

    // Create comment record
    const comment = await prisma.comment.create({
      data: {
        organizationId: page.organizationId,
        postId: monitoredPost.id,
        commentId: commentData.commentId,
        parentCommentId: commentData.parentId,
        commenterId: commentData.senderId,
        commenterName: commentData.senderName,
        commentText: commentData.message,
        createdAt: commentData.createdTime,
      },
    });

    // Update post comment count
    await prisma.monitoredPost.update({
      where: { id: monitoredPost.id },
      data: {
        commentCount: {
          increment: 1,
        },
      },
    });

    // Queue for auto-forward
    await getCommentQueue().add('forward-comment', {
      commentId: comment.id,
      organizationId: page.organizationId,
    });

    // Emit real-time update
    io.to(`org:${page.organizationId}`).emit('new-comment', {
      comment,
      post: monitoredPost,
    });

    logger.info(`New comment processed: ${comment.id}`);
  } catch (error) {
    logger.error('Error processing new comment:', error);
  }
}

async function handleDeliveryEvent(pageId: string, delivery: any) {
  try {
    // Update broadcast stats for delivered messages
    if (delivery.mids && delivery.mids.length > 0) {
      logger.debug('Message delivery confirmed', {
        pageId,
        messageIds: delivery.mids,
      });

      // TODO: Update broadcast delivery stats
    }
  } catch (error) {
    logger.error('Error handling delivery event:', error);
  }
}

async function handleReadEvent(pageId: string, read: any) {
  try {
    // Update broadcast stats for read messages
    logger.debug('Message read confirmed', {
      pageId,
      watermark: read.watermark,
    });

    // TODO: Update broadcast read stats
  } catch (error) {
    logger.error('Error handling read event:', error);
  }
}

export default router;