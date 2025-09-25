import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { loginSchema } from '../schemas/authSchema';

export const authController = {
  async login(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    const { email, password } = data;

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      throw new AppError('Usuário inativo', 401);
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Credenciais inválidas', 401);
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as any
    );

    // Retornar token e dados do usuário
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  },
};