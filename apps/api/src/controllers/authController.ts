import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '@repo/database';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { ERROR_CODES } from '@repo/shared';
import { logger } from '../utils/logger';

interface FacebookAuthRequest extends Request {
  user?: {
    user: any;
    accessToken: string;
  };
}

export const authController = {
  async facebookCallback(req: FacebookAuthRequest, res: Response) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication failed', ERROR_CODES.UNAUTHORIZED);
      }

      const { user } = req.user;

      // Check if user has an organization
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: { organization: true },
      });

      let organizationId = membership?.organizationId;

      // If no organization, create one
      if (!organizationId) {
        const org = await prisma.organization.create({
          data: {
            name: `${user.name}'s Workspace`,
            slug: `workspace-${user.id.slice(0, 8)}`,
            plan: 'starter',
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          },
        });

        await prisma.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            role: 'owner',
            permissions: ['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings'],
          },
        });

        // Initialize usage tracking
        const currentMonth = new Date().toISOString().slice(0, 7);
        await prisma.usageTracking.create({
          data: {
            organizationId: org.id,
            month: currentMonth,
            teamMembers: 1,
          },
        });

        organizationId = org.id;
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        organizationId,
        role: (membership?.role || 'owner') as any,
        permissions: (membership?.permissions || ['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings']) as any,
      });

      // Store Facebook access token (encrypted in production)
      // TODO: Encrypt token before storing
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      // Redirect with token
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    } catch (error) {
      logger.error('Facebook callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
  },

  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, organizationName } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError(400, 'Email already registered', ERROR_CODES.VALIDATION_ERROR);
      }

      // Hash password
      await bcrypt.hash(password, 10);

      // Create user and organization in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            name,
            // Store hashed password in a separate table in production
          },
        });

        // Create organization
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
            plan: 'starter',
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });

        // Create membership
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            role: 'owner',
            permissions: ['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings'],
          },
        });

        // Initialize usage tracking
        const currentMonth = new Date().toISOString().slice(0, 7);
        await tx.usageTracking.create({
          data: {
            organizationId: org.id,
            month: currentMonth,
            teamMembers: 1,
          },
        });

        return { user, org };
      });

      // Generate token
      const token = generateToken({
        userId: result.user.id,
        organizationId: result.org.id,
        role: 'owner' as any,
        permissions: ['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings'] as any,
      });

      res.json({
        success: true,
        data: {
          user: result.user,
          organization: result.org,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError(401, 'Invalid credentials', ERROR_CODES.UNAUTHORIZED);
      }

      // TODO: Verify password from separate table
      // For now, just proceed with login

      // Get organization membership
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: { organization: true },
      });

      if (!membership) {
        throw new AppError(403, 'No organization found', ERROR_CODES.ORG_NOT_FOUND);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate token
      const token = generateToken({
        userId: user.id,
        organizationId: membership.organizationId,
        role: membership.role as any,
        permissions: membership.permissions as any,
      });

      res.json({
        success: true,
        data: {
          user,
          organization: membership.organization,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(_req: Request, res: Response) {
    // In JWT, logout is handled client-side by removing the token
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(401, 'Not authenticated', ERROR_CODES.UNAUTHORIZED);
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: req.user.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: req.user.user.id,
          organizationId: req.user.organizationId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              status: true,
              logoUrl: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: {
          user: fullUser,
          organization: membership?.organization,
          role: membership?.role,
          permissions: membership?.permissions,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};