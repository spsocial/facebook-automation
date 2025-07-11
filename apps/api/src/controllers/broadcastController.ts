import { Request, Response, NextFunction } from 'express';
import prisma from '@repo/database';
import { FacebookService } from '../services/facebookService';
import { getBroadcastQueue } from '../services/queue';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES, PLANS, BroadcastStatus } from '@repo/shared';
import { logger } from '../utils/logger';

export const broadcastController = {
  // Get broadcasts
  async getBroadcasts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { page = 1, limit = 20, status, pageId } = req.query;

      const where: any = { organizationId };
      if (status) where.status = status;
      if (pageId) where.pageId = pageId;

      const [broadcasts, total] = await Promise.all([
        prisma.broadcast.findMany({
          where,
          include: {
            page: {
              select: {
                id: true,
                pageName: true,
              },
            },
            createdBy: {
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
        prisma.broadcast.count({ where }),
      ]);

      res.json({
        success: true,
        data: broadcasts,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      next(error);
    }
  },

  // Get single broadcast
  async getBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const broadcastId = req.params.broadcastId;

      const broadcast = await prisma.broadcast.findFirst({
        where: {
          id: broadcastId,
          organizationId,
        },
        include: {
          page: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!broadcast) {
        throw new AppError(404, 'Broadcast not found', ERROR_CODES.NOT_FOUND);
      }

      res.json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create broadcast
  async createBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.user.id;
      const {
        pageId,
        messageText,
        messageAttachments,
        recipientType,
        recipientIds,
        scheduledAt,
      } = req.body;

      // Check organization limits
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new AppError(404, 'Organization not found', ERROR_CODES.ORG_NOT_FOUND);
      }

      // Check monthly broadcast limit
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usage = await prisma.usageTracking.findUnique({
        where: {
          organizationId_month: {
            organizationId,
            month: currentMonth,
          },
        },
      });

      const planLimits = PLANS[organization.plan as keyof typeof PLANS].limits;
      if (
        planLimits.broadcasts !== -1 &&
        usage &&
        usage.broadcastsSent >= planLimits.broadcasts
      ) {
        throw new AppError(
          400,
          'Monthly broadcast limit reached',
          ERROR_CODES.PLAN_LIMIT_EXCEEDED
        );
      }

      // Verify page exists and is active
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

      // Get recipients based on type
      let recipients: string[] = [];
      if (recipientType === 'all') {
        const fbService = new FacebookService(page.pageAccessToken);
        const conversations = await fbService.getPageConversations(page.pageAccessToken);
        recipients = conversations
          .flatMap((conv: any) =>
            conv.participants.data.filter((p: any) => p.id !== page.pageId)
          )
          .map((p: any) => p.id);
      } else if (recipientType === 'individual') {
        recipients = recipientIds || [];
      }

      // Create broadcast
      const broadcast = await prisma.broadcast.create({
        data: {
          organizationId,
          pageId,
          createdById: userId,
          messageText,
          messageAttachments: messageAttachments || [],
          recipientType,
          recipientIds: recipients,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? 'scheduled' : 'sending',
        },
      });

      if (!scheduledAt) {
        // Send immediately
        await getBroadcastQueue().add('send-broadcast', {
          broadcastId: broadcast.id,
          organizationId,
        });
      } else {
        // Schedule for later
        const delay = new Date(scheduledAt).getTime() - Date.now();
        await getBroadcastQueue().add(
          'send-broadcast',
          {
            broadcastId: broadcast.id,
            organizationId,
          },
          { delay }
        );
      }

      res.json({
        success: true,
        data: broadcast,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update broadcast (only if scheduled)
  async updateBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const broadcastId = req.params.broadcastId;
      const { messageText, messageAttachments, scheduledAt } = req.body;

      const broadcast = await prisma.broadcast.findFirst({
        where: {
          id: broadcastId,
          organizationId,
          status: 'scheduled',
        },
      });

      if (!broadcast) {
        throw new AppError(404, 'Broadcast not found or cannot be edited', ERROR_CODES.NOT_FOUND);
      }

      const updatedBroadcast = await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          messageText,
          messageAttachments,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });

      // Update queue job
      // TODO: Remove old job and create new one with updated delay

      res.json({
        success: true,
        data: updatedBroadcast,
      });
    } catch (error) {
      next(error);
    }
  },

  // Cancel broadcast
  async cancelBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const broadcastId = req.params.broadcastId;

      const broadcast = await prisma.broadcast.findFirst({
        where: {
          id: broadcastId,
          organizationId,
          status: 'scheduled',
        },
      });

      if (!broadcast) {
        throw new AppError(404, 'Broadcast not found or cannot be cancelled', ERROR_CODES.NOT_FOUND);
      }

      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'cancelled' as BroadcastStatus },
      });

      // TODO: Remove from queue

      res.json({
        success: true,
        message: 'Broadcast cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get broadcast statistics
  async getBroadcastStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { startDate, endDate } = req.query;

      const where: any = { organizationId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [total, byStatus, byPage] = await Promise.all([
        prisma.broadcast.count({ where }),
        prisma.broadcast.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.broadcast.groupBy({
          by: ['pageId'],
          where,
          _count: true,
          _sum: {
            stats: true,
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          byStatus: byStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>),
          byPage,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Send test broadcast
  async sendTestBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.user.id;
      const { pageId, messageText, messageAttachments, testRecipientId } = req.body;

      // Verify page
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

      // Send test message
      const fbService = new FacebookService(page.pageAccessToken);
      const message: any = {};
      if (messageText) message.text = messageText;
      if (messageAttachments?.length) {
        message.attachment = {
          type: messageAttachments[0].type,
          payload: {
            url: messageAttachments[0].url,
          },
        };
      }

      await fbService.sendMessage(testRecipientId || userId, message, page.pageAccessToken);

      res.json({
        success: true,
        message: 'Test message sent successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};