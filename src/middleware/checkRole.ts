import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';
import prisma from '../prisma/client';

export const checkAdminRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  if (user.role !== UserRole.ADMIN) {
    throw new AppError('Acesso negado. Apenas administradores podem realizar esta ação', 403);
  }

  next();
};

export const checkCreateUserPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  const { role } = req.body;

  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  // Se o usuário não for ADMIN e estiver tentando criar um ATTENDANT ou OFFICE_OWNER
  if (user.role !== UserRole.ADMIN && (role === UserRole.ATTENDANT || role === UserRole.OFFICE_OWNER)) {
    throw new AppError('Acesso negado. Apenas administradores podem criar usuários deste tipo', 403);
  }

  next();
};