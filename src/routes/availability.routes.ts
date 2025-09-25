import { Router } from 'express';
import { availabilityController } from '../controllers/availability.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /api/offices/:id/availability - Criar disponibilidade (requer autenticação - apenas OFFICE_OWNER)
router.post('/:id/availability', authMiddleware, availabilityController.create);

// GET /api/offices/:id/availability - Listar disponibilidades (público)
router.get('/:id/availability', availabilityController.index);

// DELETE /api/offices/:id/availability/:availId - Deletar disponibilidade (requer autenticação - apenas OFFICE_OWNER)
router.delete('/:id/availability/:availId', authMiddleware, availabilityController.delete);

export default router;