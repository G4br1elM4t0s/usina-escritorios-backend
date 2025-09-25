import { Router } from 'express';
import { bookingController } from '../controllers/bookingController';

import { UserRole } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/checkRole';

const router = Router();

// Middleware para autenticação opcional (não bloqueia se não autenticado)
const optionalAuth = (req: any, res: any, next: any) => {
  // Tentar autenticar, mas não falhar se não conseguir
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Se tem token, tentar validar
    authMiddleware(req, res, (error) => {
      // Se der erro na validação, continuar sem autenticação
      if (error) {
        req.user = undefined;
      }
      next();
    });
  } else {
    // Sem token, continuar sem autenticação
    req.user = undefined;
    next();
  }
};

// ===== ROTAS PÚBLICAS =====

/**
 * POST /api/bookings
 * Cria um novo booking (público - visitantes podem criar)
 */
router.post('/', optionalAuth, bookingController.createBooking.bind(bookingController));

/**
 * GET /api/bookings
 * Lista bookings com filtros e permissões por role
 * - Público: vê todos com campos limitados
 * - Autenticado: vê conforme permissões do role
 */
router.get('/', optionalAuth, bookingController.listBookings.bind(bookingController));

/**
 * GET /api/bookings/my
 * Lista bookings do visitante (público - requer visitorEmail na query)
 */
router.get('/my', bookingController.getMyBookings.bind(bookingController));

/**
 * GET /api/bookings/:id
 * Busca booking por ID
 * - Público: pode ver se informar visitorEmail correto
 * - Autenticado: vê conforme permissões do role
 */
router.get('/:id', optionalAuth, bookingController.getBookingById.bind(bookingController));

/**
 * POST /api/bookings/:id/cancel
 * Cancela booking (público - requer visitorEmail no body)
 */
router.post('/:id/cancel', bookingController.cancelBooking.bind(bookingController));

// ===== ROTAS AUTENTICADAS =====

/**
 * PUT /api/bookings/:id
 * Atualiza booking (autenticado ou público com visitorEmail)
 * - ADMIN: pode alterar qualquer campo
 * - ATTENDANT: pode confirmar, cancelar e marcar como completed
 * - OFFICE_OWNER: pode confirmar ou cancelar bookings do(s) seu(s) office(s)
 * - VISITOR: pode cancelar se for o dono (via visitorEmail)
 */
router.put('/:id', optionalAuth, bookingController.updateBooking.bind(bookingController));

/**
 * POST /api/bookings/:id/confirm
 * Confirma booking (apenas autenticados com permissão)
 */
router.post('/:id/confirm', 
  authMiddleware,
  checkRole([UserRole.ADMIN, UserRole.ATTENDANT, UserRole.OFFICE_OWNER]),
  bookingController.confirmBooking.bind(bookingController)
);

/**
 * POST /api/bookings/:id/complete
 * Marca booking como concluído (apenas ADMIN e ATTENDANT)
 */
router.post('/:id/complete',
  authMiddleware,
  checkRole([UserRole.ADMIN, UserRole.ATTENDANT]),
  bookingController.completeBooking.bind(bookingController)
);

/**
 * DELETE /api/bookings/:id
 * Deleção física não permitida
 */
router.delete('/:id', bookingController.deleteBooking.bind(bookingController));

export default router;