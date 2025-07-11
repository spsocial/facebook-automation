import { Router } from 'express';
import { broadcastController } from '../controllers/broadcastController';
import { authenticate, requireOrganization, requirePermission } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { createBroadcastSchema, updateBroadcastSchema, paginationSchema, broadcastFilterSchema } from '@repo/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOrganization);

// Broadcast management
router.get('/', requirePermission('broadcast'), validateQuery(paginationSchema), broadcastController.getBroadcasts);
router.get('/stats', requirePermission('analytics'), broadcastController.getBroadcastStats);
router.get('/:broadcastId', requirePermission('broadcast'), broadcastController.getBroadcast);
router.post('/', requirePermission('broadcast'), validateRequest(createBroadcastSchema), broadcastController.createBroadcast);
router.put('/:broadcastId', requirePermission('broadcast'), validateRequest(updateBroadcastSchema), broadcastController.updateBroadcast);
router.delete('/:broadcastId', requirePermission('broadcast'), broadcastController.cancelBroadcast);

// Test broadcast
router.post('/test', requirePermission('broadcast'), broadcastController.sendTestBroadcast);

export default router;