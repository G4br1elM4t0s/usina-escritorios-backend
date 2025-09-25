import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /api/appointments - Criar appointment (público - não precisa autenticação)
router.post('/', appointmentController.create);

// GET /api/appointments - Listar appointments (requer autenticação)
router.get('/', authMiddleware, appointmentController.index);

// GET /api/appointments/:id - Detalhar appointment (requer autenticação)
router.get('/:id', authMiddleware, appointmentController.show);

// PUT /api/appointments/:id - Atualizar status (requer autenticação)
router.put('/:id', authMiddleware, appointmentController.update);

export default router;