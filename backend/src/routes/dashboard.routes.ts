import { Router } from 'express';
import {
  getDashboardStats,
  getRecentTransactions,
  getChartData
} from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/recent-transactions', getRecentTransactions);
router.get('/chart-data', getChartData);

export default router;
