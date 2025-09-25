import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// POST /api/auth/login - Login user
router.post('/login', authController.login);

export default router;