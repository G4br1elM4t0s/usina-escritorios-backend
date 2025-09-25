import { Router } from 'express';
import { registerUser } from '../controllers/userController';

const router = Router();

// POST /api/users - Register a new user
router.post('/', registerUser);

// Add more user routes here (protected by authentication)
// Example: router.get('/profile', authenticate, getUserProfile);

export default router;