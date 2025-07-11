import { Request, Response, NextFunction } from 'express';
import prisma from '@repo/database';
import { FacebookService } from '../services/facebookService';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES, PLANS } from '@repo/shared';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: any & {
    facebookAccessToken?: string;
  };
}

export const pageController = {
  // Get connected pages
  async getPages(req: Request, res: Response, next: NextFunction) {
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
        orderBy: { connectedAt: 'desc' },
      });

      res.json({
        success: true,
        data: pages,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get available pages from Facebook
  async getAvailablePages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      // Get user's Facebook access token
      // In production, this should be stored encrypted
      const facebookAccessToken = req.headers['x-facebook-token'] as string;

      if (!facebookAccessToken) {
        throw new AppError(400, 'Facebook access token required', ERROR_CODES.FACEBOOK_API_ERROR);
      }

      const fbService = new FacebookService(facebookAccessToken);
      const facebookPages = await fbService.getUserPages();

      // Get already connected pages
      const connectedPages = await prisma.facebookPage.findMany({
        where: { organizationId },
        select: { pageId: true },
      });

      const connectedPageIds = new Set(connectedPages.map(p => p.pageId));

      // Filter out already connected pages
      const availablePages = facebookPages.filter((page: any) => !connectedPageIds.has(page.id));

      res.json({
        success: true,
        data: availablePages,
      });
    } catch (error) {
      next(error);
    }
  },

  // Connect a page
  async connectPage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.user.id;
      const { pageId, pageName, pageAccessToken } = req.body;

      // Check organization limits
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: { pages: true },
          },
        },
      });

      if (!organization) {
        throw new AppError(404, 'Organization not found', ERROR_CODES.ORG_NOT_FOUND);
      }

      const planLimits = PLANS[organization.plan as keyof typeof PLANS].limits;
      if (planLimits.pages !== -1 && organization._count.pages >= planLimits.pages) {
        throw new AppError(400, 'Page limit reached for your plan', ERROR_CODES.PLAN_LIMIT_EXCEEDED);
      }

      // Check if page already connected
      const existingPage = await prisma.facebookPage.findUnique({
        where: {
          organizationId_pageId: {
            organizationId: organizationId!,
            pageId,
          },
        },
      });

      if (existingPage) {
        if (existingPage.isActive) {
          throw new AppError(400, 'Page already connected', ERROR_CODES.VALIDATION_ERROR);
        }

        // Reactivate page
        const page = await prisma.facebookPage.update({
          where: { id: existingPage.id },
          data: {
            isActive: true,
            pageAccessToken,
            connectedById: userId!,
            connectedAt: new Date(),
          },
        });

        res.json({
          success: true,
          data: page,
        });
        return;
      }

      // Get page details from Facebook
      const fbService = new FacebookService(pageAccessToken);
      const pageDetails = await fbService.getPageDetails(pageId, pageAccessToken);

      // Create new page connection
      const page = await prisma.facebookPage.create({
        data: {
          organizationId: organizationId!,
          pageId,
          pageName: pageDetails.name || pageName,
          pageAccessToken, // Should be encrypted in production
          followersCount: pageDetails.fan_count || 0,
          connectedById: userId!,
        },
      });

      // Subscribe to webhooks
      try {
        await fbService.subscribePageToWebhooks(pageId, pageAccessToken);
      } catch (error) {
        logger.error('Failed to subscribe to webhooks:', error);
      }

      // Update usage tracking
      const currentMonth = new Date().toISOString().slice(0, 7);
      await prisma.usageTracking.upsert({
        where: {
          organizationId_month: {
            organizationId: organizationId!,
            month: currentMonth,
          },
        },
        update: {
          pagesConnected: {
            increment: 1,
          },
        },
        create: {
          organizationId: organizationId!,
          month: currentMonth,
          pagesConnected: 1,
        },
      });

      res.json({
        success: true,
        data: page,
      });
    } catch (error) {
      next(error);
    }
  },

  // Disconnect a page
  async disconnectPage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const pageId = req.params.pageId;

      await prisma.facebookPage.update({
        where: {
          id: pageId,
          organizationId: organizationId!,
        },
        data: {
          isActive: false,
        },
      });

      // Update usage tracking
      const currentMonth = new Date().toISOString().slice(0, 7);
      await prisma.usageTracking.update({
        where: {
          organizationId_month: {
            organizationId: organizationId!,
            month: currentMonth,
          },
        },
        data: {
          pagesConnected: {
            decrement: 1,
          },
        },
      });

      res.json({
        success: true,
        message: 'Page disconnected successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get page posts
  async getPagePosts(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const pageId = req.params.pageId;

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

      const fbService = new FacebookService(page.pageAccessToken);
      const posts = await fbService.getPagePosts(page.pageId, page.pageAccessToken);

      res.json({
        success: true,
        data: posts,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get page followers (conversations)
  async getPageFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const pageId = req.params.pageId;

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

      const fbService = new FacebookService(page.pageAccessToken);
      const conversations = await fbService.getPageConversations(page.pageAccessToken);

      // Extract unique participants
      const followers = conversations.flatMap((conv: any) => 
        conv.participants.data.filter((p: any) => p.id !== page.pageId)
      );

      // Remove duplicates
      const uniqueFollowers = Array.from(
        new Map(followers.map((f: any) => [f.id, f])).values()
      );

      res.json({
        success: true,
        data: uniqueFollowers,
      });
    } catch (error) {
      next(error);
    }
  },

  // Refresh page data
  async refreshPage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const pageId = req.params.pageId;

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

      const fbService = new FacebookService(page.pageAccessToken);
      const pageDetails = await fbService.getPageDetails(page.pageId, page.pageAccessToken);

      const updatedPage = await prisma.facebookPage.update({
        where: { id: pageId },
        data: {
          pageName: pageDetails.name,
          followersCount: pageDetails.fan_count || 0,
        },
      });

      res.json({
        success: true,
        data: updatedPage,
      });
    } catch (error) {
      next(error);
    }
  },
};