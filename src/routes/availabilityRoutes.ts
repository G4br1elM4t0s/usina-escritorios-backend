import { Router } from 'express';
import { availabilityController } from '../controllers/availabilityController';
import { authMiddleware } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/checkRole';
import { UserRole } from '@prisma/client';

const router = Router({ mergeParams: true }); // mergeParams para acessar :officeId

// ===== ROTAS PÚBLICAS =====

/**
 * GET /api/offices/:id/availability
 * Lista disponibilidades de um office (público)
 */
router.get('/', availabilityController.listAvailabilities.bind(availabilityController));

/**
 * GET /api/offices/:id/availability/slots
 * Lista slots disponíveis para agendamento (público)
 * Query params: duration (em minutos), startDate, endDate
 */
router.get('/slots', availabilityController.getAvailableSlots.bind(availabilityController));

/**
 * GET /api/offices/:id/availability/calendar
 * Visão de calendário com disponibilidades e bookings (público)
 * Query params: startDate, endDate
 */
router.get('/calendar', availabilityController.getCalendarView.bind(availabilityController));

/**
 * GET /api/offices/:id/availability/:availId
 * Busca disponibilidade específica por ID (público)
 */
router.get('/:availId', availabilityController.getAvailabilityById.bind(availabilityController));

// ===== ROTAS AUTENTICADAS (OFFICE_OWNER) =====

/**
 * POST /api/offices/:id/availability
 * Cria nova disponibilidade (apenas OFFICE_OWNER do office)
 */
router.post('/',
  authMiddleware,
  checkRole([UserRole.OFFICE_OWNER, UserRole.ADMIN]),
  availabilityController.createAvailability.bind(availabilityController)
);

/**
 * PUT /api/offices/:id/availability/:availId
 * Atualiza disponibilidade (apenas OFFICE_OWNER do office)
 */
router.put('/:availId',
  authMiddleware,
  checkRole([UserRole.OFFICE_OWNER, UserRole.ADMIN]),
  availabilityController.updateAvailability.bind(availabilityController)
);

/**
 * DELETE /api/offices/:id/availability/:availId
 * Remove disponibilidade (apenas OFFICE_OWNER do office)
 */
router.delete('/:availId',
  authMiddleware,
  checkRole([UserRole.OFFICE_OWNER, UserRole.ADMIN]),
  availabilityController.deleteAvailability.bind(availabilityController)
);

export default router;