import { Router } from 'express';

const router = Router();

// TODO: Implement subscription routes
router.get('/', (req, res) => {
  res.json({ message: 'Subscriptions endpoint' });
});

export default router;