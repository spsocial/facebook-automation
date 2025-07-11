import { Request, Response, NextFunction } from 'express';
import prisma from '@repo/database';
import { FacebookService } from '../services/facebookService';
import { getCommentQueue } from '../services/queue';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '@repo/shared';
import { logger } from '../utils/logger';
import { io } from '../index';

export const commentController = {
  // Get monitored posts
  async getMonitoredPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { page = 1, limit = 20, isActive } = req.query;

      const where: any = { organizationId };
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const [posts, total] = await Promise.all([
        prisma.monitoredPost.findMany({
          where,
          include: {
            page: {
              select: {
                id: true,
                pageName: true,
              },
            },
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy: { addedAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.monitoredPost.count({ where }),
      ]);

      res.json({
        success: true,
        data: posts,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // Add post to monitor
  async addMonitoredPost(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.user.id;
      const { pageId, postUrl, postId } = req.body;

      // Verify page belongs to organization
      const page = await prisma.facebookPage.findFirst({
        where: {
          id: pageId,
          organizationId,
          isActive: true,
        },
      });

      if (!page) {
        throw new AppError(404, 'Page not found', ERROR_CODES.PAGE_NOT_CONNECTED);
      }

      let fbPostId = postId;
      let postDetails: any = {};

      // If URL provided, extract post ID
      if (postUrl && !postId) {
        const fbService = new FacebookService(page.pageAccessToken);
        postDetails = await fbService.getPostByUrl(postUrl, page.pageAccessToken);
        fbPostId = postDetails.id;
      }

      // Check if already monitoring
      const existing = await prisma.monitoredPost.findUnique({
        where: {
          organizationId_postId: {
            organizationId,
            postId: fbPostId,
          },
        },
      });

      if (existing) {
        if (existing.isActive) {
          throw new AppError(400, 'Post already being monitored', ERROR_CODES.VALIDATION_ERROR);
        }

        // Reactivate
        const post = await prisma.monitoredPost.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            addedById: userId,
            addedAt: new Date(),
          },
        });

        return res.json({
          success: true,
          data: post,
        });
      }

      // Create new monitored post
      const post = await prisma.monitoredPost.create({
        data: {
          organizationId,
          pageId: page.id,
          postId: fbPostId,
          postUrl: postUrl || postDetails.permalink_url,
          postContent: postDetails.message || null,
          addedById: userId,
        },
      });

      // Fetch existing comments
      const fbService = new FacebookService(page.pageAccessToken);
      const comments = await fbService.getPostComments(fbPostId, page.pageAccessToken);

      // Process existing comments
      for (const comment of comments.data || []) {
        try {
          await prisma.comment.create({
            data: {
              organizationId,
              postId: post.id,
              commentId: comment.id,
              commenterId: comment.from?.id,
              commenterName: comment.from?.name,
              commentText: comment.message,
              createdAt: new Date(comment.created_time),
            },
          });
        } catch (error) {
          // Ignore duplicate errors
        }
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      next(error);
    }
  },

  // Stop monitoring post
  async removeMonitoredPost(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const postId = req.params.postId;

      await prisma.monitoredPost.update({
        where: {
          id: postId,
          organizationId,
        },
        data: {
          isActive: false,
        },
      });

      res.json({
        success: true,
        message: 'Stopped monitoring post',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get comments for a post
  async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { postId, page = 1, limit = 50, isReplied } = req.query;

      const where: any = { organizationId };
      if (postId) where.postId = postId;
      if (isReplied !== undefined) where.isReplied = isReplied === 'true';

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: {
            post: {
              select: {
                id: true,
                postUrl: true,
                postContent: true,
              },
            },
            repliedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.comment.count({ where }),
      ]);

      res.json({
        success: true,
        data: comments,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // Reply to comment
  async replyToComment(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.user.id;
      const commentId = req.params.commentId;
      const { replyText, sendToMessenger } = req.body;

      // Get comment details
      const comment = await prisma.comment.findFirst({
        where: {
          id: commentId,
          organizationId,
        },
        include: {
          post: {
            include: {
              page: true,
            },
          },
        },
      });

      if (!comment) {
        throw new AppError(404, 'Comment not found', ERROR_CODES.NOT_FOUND);
      }

      const fbService = new FacebookService(comment.post.page.pageAccessToken);

      // Reply on Facebook
      await fbService.replyToComment(comment.commentId, replyText, comment.post.page.pageAccessToken);

      // Send to Messenger if requested
      if (sendToMessenger && comment.commenterId) {
        await fbService.sendMessage(
          comment.commenterId,
          { text: replyText },
          comment.post.page.pageAccessToken
        );
      }

      // Update comment
      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: {
          isReplied: true,
          replyText,
          repliedAt: new Date(),
          repliedById: userId,
        },
      });

      // Emit update
      io.to(`org:${organizationId}`).emit('comment-replied', {
        commentId,
        replyText,
      });

      res.json({
        success: true,
        data: updatedComment,
      });
    } catch (error) {
      next(error);
    }
  },

  // Forward comment to Messenger manually
  async forwardToMessenger(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const commentId = req.params.commentId;

      const comment = await prisma.comment.findFirst({
        where: {
          id: commentId,
          organizationId,
        },
      });

      if (!comment) {
        throw new AppError(404, 'Comment not found', ERROR_CODES.NOT_FOUND);
      }

      // Queue for forwarding
      await getCommentQueue().add('forward-comment', {
        commentId: comment.id,
        organizationId,
      });

      res.json({
        success: true,
        message: 'Comment queued for forwarding',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get comment statistics
  async getCommentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { startDate, endDate } = req.query;

      const where: any = { organizationId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [total, replied, forwarded, byPost] = await Promise.all([
        prisma.comment.count({ where }),
        prisma.comment.count({ where: { ...where, isReplied: true } }),
        prisma.comment.count({ where: { ...where, isForwarded: true } }),
        prisma.comment.groupBy({
          by: ['postId'],
          where,
          _count: true,
        }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          replied,
          forwarded,
          replyRate: total > 0 ? (replied / total) * 100 : 0,
          forwardRate: total > 0 ? (forwarded / total) * 100 : 0,
          byPost,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get quick reply templates
  async getQuickReplies(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement quick reply templates
      const templates = [
        {
          id: '1',
          title: 'ขอบคุณสำหรับความสนใจ',
          text: 'ขอบคุณสำหรับความสนใจค่ะ สามารถสอบถามข้อมูลเพิ่มเติมได้ทาง inbox นะคะ',
        },
        {
          id: '2',
          title: 'ส่งข้อมูลทาง inbox',
          text: 'สวัสดีค่ะ ทางเราได้ส่งข้อมูลไปทาง inbox แล้วนะคะ กรุณาตรวจสอบข้อความค่ะ',
        },
        {
          id: '3',
          title: 'ติดต่อกลับ',
          text: 'ขอบคุณค่ะ ทางเราจะติดต่อกลับโดยเร็วที่สุดค่ะ',
        },
      ];

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  },
};