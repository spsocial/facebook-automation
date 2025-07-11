import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/authController';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { loginSchema, signupSchema } from '@repo/shared';

const router = Router();

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email', 'public_profile', 'pages_show_list', 'pages_messaging', 'pages_read_engagement']
}));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  authController.facebookCallback as any
);

// Local auth (for testing)
router.post('/signup', validateRequest(signupSchema), authController.signup);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;