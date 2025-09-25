import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';
import { checkAdminRole, checkCreateUserPermission } from '../middleware/checkRole';

const router = Router();

// Rotas do CRUD de usuários
router.get('/', authenticate, userController.index);
router.get('/:id', authenticate, userController.show);
router.post('/', authenticate, checkCreateUserPermission, userController.create);
router.put('/:id', authenticate, checkAdminRole, userController.update);
router.delete('/:id', authenticate, checkAdminRole, userController.delete);

export default router;