import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AppError } from './errorHandler';
import { ERROR_CODES, Permission } from '@repo/shared';

// Extend Express Request type
declare global {
  namespace Express {
    interface User {
      user: {
        id: string;
        email: string;
        name?: string;
      };
      organizationId?: string;
      membership?: {
        role: string;
        permissions: string[];
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      return next(new AppError(401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED));
    }
    req.user = user;
    next();
  })(req, res, next);
};

export const requireOrganization = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.organizationId || !req.user?.membership) {
    return next(new AppError(403, 'No organization access', ERROR_CODES.ORG_NOT_FOUND));
  }
  next();
};

export const requirePermission = (permission: Permission) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.membership) {
      return next(new AppError(403, 'Access denied', ERROR_CODES.UNAUTHORIZED));
    }

    const { role, permissions } = req.user.membership;

    // Owners have all permissions
    if (role === 'owner') {
      return next();
    }

    // Check specific permission
    if (!permissions.includes(permission)) {
      return next(new AppError(403, `Missing permission: ${permission}`, ERROR_CODES.UNAUTHORIZED));
    }

    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.membership) {
      return next(new AppError(403, 'Access denied', ERROR_CODES.UNAUTHORIZED));
    }

    if (!roles.includes(req.user.membership.role)) {
      return next(new AppError(403, 'Insufficient role', ERROR_CODES.UNAUTHORIZED));
    }

    next();
  };
};