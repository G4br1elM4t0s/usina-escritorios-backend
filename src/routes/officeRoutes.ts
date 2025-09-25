import { Router } from 'express';
import { officeController } from '../controllers/officeController';
import { authenticate } from '../middleware/authMiddleware';
import { checkAdminRole, checkOfficeOwnerAccess } from '../middleware/checkOfficeRole';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.get('/', officeController.index);
router.get('/:id', officeController.show);

// Rotas que requerem autenticação e permissões específicas
router.post('/', authenticate, checkAdminRole, officeController.create);
router.put('/:id', authenticate, checkOfficeOwnerAccess, officeController.update);
router.delete('/:id', authenticate, checkAdminRole, officeController.delete);

export default router;