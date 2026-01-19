import { Router } from 'express';
import {
  createLot,
  getLots,
  getLot,
  updateLot,
  generateLotNumber,
  deleteLot
} from '../controllers/lot.controller';
import { createSale } from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All lot routes require authentication
router.use(authenticateToken);

router.post('/', createLot);
router.get('/', getLots);
router.get('/:id', getLot);
router.put('/:id', updateLot);
router.delete('/:id', deleteLot);
router.post('/generate-number', generateLotNumber);
router.post('/:id/sell', createSale);

export default router;
