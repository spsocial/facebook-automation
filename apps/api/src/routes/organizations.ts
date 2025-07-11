import { Router } from 'express';
import { organizationController } from '../controllers/organizationController';
import { authenticate, requireOrganization, requirePermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { updateOrganizationSchema, inviteMemberSchema, updateMemberSchema } from '@repo/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(requireOrganization);

// Organization management
router.get('/current', organizationController.getCurrent);
router.put('/current', requirePermission('settings'), validateRequest(updateOrganizationSchema), organizationController.update);

// Member management
router.get('/members', requirePermission('team'), organizationController.getMembers);
router.post('/members/invite', requirePermission('team'), validateRequest(inviteMemberSchema), organizationController.inviteMember);
router.put('/members/:memberId', requirePermission('team'), validateRequest(updateMemberSchema), organizationController.updateMember);
router.delete('/members/:memberId', requirePermission('team'), organizationController.removeMember);

// Usage tracking
router.get('/usage', organizationController.getUsage);

export default router;