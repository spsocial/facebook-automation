import { Router } from 'express';
import { pageController } from '../controllers/pageController';
import { authenticate, requireOrganization, requirePermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { connectPageSchema } from '@repo/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOrganization);

// Page management
router.get('/', pageController.getPages);
router.get('/available', pageController.getAvailablePages);
router.post('/connect', requirePermission('settings'), validateRequest(connectPageSchema), pageController.connectPage);
router.delete('/:pageId/disconnect', requirePermission('settings'), pageController.disconnectPage);

// Page data
router.get('/:pageId/posts', pageController.getPagePosts);
router.get('/:pageId/followers', pageController.getPageFollowers);
router.post('/:pageId/refresh', pageController.refreshPage);

export default router;