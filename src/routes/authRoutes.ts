import { Router } from 'express';
import { loginUser } from '../controllers/userController';

const router = Router();

// POST /api/auth/login - Login user
router.post('/login', loginUser);

export default router;