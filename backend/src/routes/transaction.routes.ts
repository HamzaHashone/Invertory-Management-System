import { Router } from 'express';
import {
  createSale,
  getTransactions,
  getTransaction
} from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All transaction routes require authentication
router.use(authenticateToken);

router.post('/', createSale);
router.get('/', getTransactions);
router.get('/:id', getTransaction);

export default router;
