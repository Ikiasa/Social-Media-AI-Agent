import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';

const router = Router();

router.get('/dashboard', getDashboardStats);

export default router;
