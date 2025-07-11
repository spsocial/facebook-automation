import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import prisma from '@repo/database';
import { logger } from '../utils/logger';

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    },
    async (accessToken, _refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await prisma.user.findUnique({
          where: { facebookId: profile.id },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              facebookId: profile.id,
              email: profile.emails?.[0]?.value || `${profile.id}@facebook.com`,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });
          logger.info(`New user created: ${user.id}`);
        } else {
          // Update last login
          user = await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        }

        return done(null, { user, accessToken });
      } catch (error) {
        logger.error('Facebook auth error:', error);
        return done(error as Error);
      }
    }
  )
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });

        if (!user) {
          return done(null, false);
        }

        // Get user's organization membership
        const membership = await prisma.organizationMember.findFirst({
          where: {
            userId: user.id,
            organizationId: payload.organizationId,
          },
          include: {
            organization: true,
          },
        });

        return done(null, {
          user: {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
          },
          organizationId: payload.organizationId,
          membership: membership ? {
            role: membership.role,
            permissions: membership.permissions,
          } : undefined,
        });
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export default passport;