import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticate, requireOrganization, requirePermission } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOrganization);

// Analytics endpoints
router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/broadcasts', requirePermission('analytics'), analyticsController.getBroadcastAnalytics);
router.get('/comments', requirePermission('analytics'), analyticsController.getCommentAnalytics);
router.get('/pages', requirePermission('analytics'), analyticsController.getPagePerformance);

export default router;