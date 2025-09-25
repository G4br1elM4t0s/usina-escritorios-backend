import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';
import prisma from '../prisma/client';

// Middleware para verificar se o usuário é ADMIN
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

// Middleware para verificar se o usuário é ADMIN ou OFFICE_OWNER do escritório específico
export const checkOfficeOwnerAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  const officeId = req.params.id;

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

  // Se for ADMIN, permite acesso
  if (user.role === UserRole.ADMIN) {
    return next();
  }

  // Se for OFFICE_OWNER, verifica se é dono do escritório
  if (user.role === UserRole.OFFICE_OWNER) {
    const office = await prisma.office.findUnique({
      where: { id: officeId },
      select: { ownerId: true },
    });

    if (!office) {
      throw new AppError('Escritório não encontrado', 404);
    }

    if (office.ownerId !== userId) {
      throw new AppError('Você só pode editar seu próprio escritório', 403);
    }

    return next();
  }

  throw new AppError('Acesso negado', 403);
};