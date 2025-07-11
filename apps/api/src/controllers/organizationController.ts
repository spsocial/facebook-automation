import { Request, Response, NextFunction } from 'express';
import prisma from '@repo/database';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '@repo/shared';

export const organizationController = {
  // Get current organization
  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        throw new AppError(404, 'No organization found', ERROR_CODES.ORG_NOT_FOUND);
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: {
              members: true,
              pages: true,
              broadcasts: true,
            },
          },
          subscriptions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!organization) {
        throw new AppError(404, 'Organization not found', ERROR_CODES.ORG_NOT_FOUND);
      }

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update organization
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { name, logoUrl, settings } = req.body;

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          name,
          logoUrl,
          settings,
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get organization members
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  },

  // Invite member
  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const { email, role, permissions } = req.body;

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create placeholder user
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0],
          },
        });
      }

      // Check if already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organizationId!,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        throw new AppError(400, 'User is already a member', ERROR_CODES.VALIDATION_ERROR);
      }

      // Create membership
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: organizationId!,
          userId: user.id,
          role,
          permissions: permissions || [],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

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
          teamMembers: {
            increment: 1,
          },
        },
        create: {
          organizationId: organizationId!,
          month: currentMonth,
          teamMembers: 1,
        },
      });

      // TODO: Send invitation email

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update member
  async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const memberId = req.params.memberId;
      const { role, permissions } = req.body;

      const member = await prisma.organizationMember.update({
        where: {
          id: memberId,
          organizationId,
        },
        data: {
          role,
          permissions,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  },

  // Remove member
  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const memberId = req.params.memberId;

      // Check if trying to remove owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          id: memberId,
          organizationId,
        },
      });

      if (!member) {
        throw new AppError(404, 'Member not found', ERROR_CODES.NOT_FOUND);
      }

      if (member.role === 'owner') {
        throw new AppError(400, 'Cannot remove organization owner', ERROR_CODES.VALIDATION_ERROR);
      }

      await prisma.organizationMember.delete({
        where: {
          id: memberId,
          organizationId,
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
          teamMembers: {
            decrement: 1,
          },
        },
      });

      res.json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // Get organization usage
  async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const currentMonth = new Date().toISOString().slice(0, 7);

      const usage = await prisma.usageTracking.findUnique({
        where: {
          organizationId_month: {
            organizationId: organizationId!,
            month: currentMonth,
          },
        },
      });

      // Get organization plan limits
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
      });

      const planLimits = {
        starter: {
          pages: 1,
          broadcasts: 1000,
          teamMembers: 3,
          commentsPerMonth: 5000,
        },
        professional: {
          pages: 5,
          broadcasts: 10000,
          teamMembers: 10,
          commentsPerMonth: 50000,
        },
        enterprise: {
          pages: -1, // unlimited
          broadcasts: -1,
          teamMembers: -1,
          commentsPerMonth: -1,
        },
      };

      const limits = planLimits[organization?.plan as keyof typeof planLimits] || planLimits.starter;

      res.json({
        success: true,
        data: {
          usage: usage || {
            broadcastsSent: 0,
            commentsProcessed: 0,
            pagesConnected: 0,
            teamMembers: 0,
          },
          limits,
          plan: organization?.plan,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};