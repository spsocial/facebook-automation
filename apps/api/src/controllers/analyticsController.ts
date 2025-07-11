import { Request, Response, NextFunction } from 'express';
import prisma from '@repo/database';

export const analyticsController = {
  // Get dashboard stats
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      const [
        totalBroadcasts,
        scheduledBroadcasts,
        totalComments,
        repliedComments,
        connectedPages,
        teamMembers,
      ] = await Promise.all([
        prisma.broadcast.count({
          where: { organizationId },
        }),
        prisma.broadcast.count({
          where: {
            organizationId,
            status: 'scheduled',
          },
        }),
        prisma.comment.count({
          where: { organizationId },
        }),
        prisma.comment.count({
          where: {
            organizationId,
            isReplied: true,
          },
        }),
        prisma.facebookPage.count({
          where: {
            organizationId,
            isActive: true,
          },
        }),
        prisma.organizationMember.count({
          where: { organizationId },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalBroadcasts,
          scheduledBroadcasts,
          totalComments,
          repliedComments,
          connectedPages,
          teamMembers,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get broadcast analytics
  async getBroadcastAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const where: any = { organizationId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Get broadcasts by date
      const broadcasts = await prisma.broadcast.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          status: true,
          stats: true,
          recipientIds: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const grouped = broadcasts.reduce((acc: any, broadcast) => {
        const date = broadcast.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            sent: 0,
            delivered: 0,
            read: 0,
            recipients: 0,
          };
        }
        acc[date].count++;
        const stats = broadcast.stats as any;
        acc[date].sent += stats?.sent || 0;
        acc[date].delivered += stats?.delivered || 0;
        acc[date].read += stats?.read || 0;
        acc[date].recipients += broadcast.recipientIds.length;
        return acc;
      }, {});

      const data = Object.values(grouped);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get comment analytics
  async getCommentAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { startDate, endDate } = req.query;

      const where: any = { organizationId };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      // Get comments by date
      const comments = await prisma.comment.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          isReplied: true,
          isForwarded: true,
          repliedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const grouped = comments.reduce((acc: any, comment) => {
        const date = comment.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            total: 0,
            replied: 0,
            forwarded: 0,
            avgResponseTime: 0,
            responseTimes: [],
          };
        }
        acc[date].total++;
        if (comment.isReplied) acc[date].replied++;
        if (comment.isForwarded) acc[date].forwarded++;
        
        // Calculate response time
        if (comment.isReplied && comment.repliedAt) {
          const responseTime = comment.repliedAt.getTime() - comment.createdAt.getTime();
          acc[date].responseTimes.push(responseTime);
        }
        
        return acc;
      }, {});

      // Calculate average response times
      Object.values(grouped).forEach((day: any) => {
        if (day.responseTimes.length > 0) {
          const avgMs = day.responseTimes.reduce((a: number, b: number) => a + b, 0) / day.responseTimes.length;
          day.avgResponseTime = Math.round(avgMs / 1000 / 60); // Convert to minutes
        }
        delete day.responseTimes;
      });

      const data = Object.values(grouped);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get page performance
  async getPagePerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      const pages = await prisma.facebookPage.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              broadcasts: true,
              posts: true,
            },
          },
        },
      });

      // Get additional stats for each page
      const pageStats = await Promise.all(
        pages.map(async (page) => {
          const [broadcastStats, commentStats] = await Promise.all([
            prisma.broadcast.findMany({
              where: { pageId: page.id },
              select: { stats: true },
            }),
            prisma.comment.count({
              where: {
                post: {
                  pageId: page.id,
                },
              },
            }),
          ]);

          const stats = broadcastStats.reduce((acc, b) => {
            const s = b.stats as any;
            return {
              sent: acc.sent + (s?.sent || 0),
              delivered: acc.delivered + (s?.delivered || 0),
              read: acc.read + (s?.read || 0),
            };
          }, { sent: 0, delivered: 0, read: 0 });
          
          return {
            ...page,
            broadcastStats: stats,
            totalComments: commentStats,
          };
        })
      );

      res.json({
        success: true,
        data: pageStats,
      });
    } catch (error) {
      next(error);
    }
  },
};