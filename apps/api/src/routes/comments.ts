import { Router } from 'express';
import { commentController } from '../controllers/commentController';
import { authenticate, requireOrganization, requirePermission } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { addMonitoredPostSchema, replyCommentSchema, paginationSchema, commentFilterSchema } from '@repo/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOrganization);

// Monitored posts
router.get('/posts', requirePermission('comments'), validateQuery(paginationSchema), commentController.getMonitoredPosts);
router.post('/posts', requirePermission('comments'), validateRequest(addMonitoredPostSchema), commentController.addMonitoredPost);
router.delete('/posts/:postId', requirePermission('comments'), commentController.removeMonitoredPost);

// Comments
router.get('/', requirePermission('comments'), validateQuery(paginationSchema), commentController.getComments);
router.get('/stats', requirePermission('analytics'), commentController.getCommentStats);
router.post('/:commentId/reply', requirePermission('comments'), validateRequest(replyCommentSchema), commentController.replyToComment);
router.post('/:commentId/forward', requirePermission('comments'), commentController.forwardToMessenger);

// Quick replies
router.get('/quick-replies', requirePermission('comments'), commentController.getQuickReplies);

export default router;