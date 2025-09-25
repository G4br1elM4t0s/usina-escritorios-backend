import { z } from 'zod';
import prisma from '../prisma/client';
import { AppError } from '../middleware/errorHandler';

// Validação do ownerId: deve existir e ter role OFFICE_OWNER
const validateOwnerId = async (ownerId: string | undefined) => {
  if (!ownerId) return true;

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { role: true },
  });

  if (!owner) {
    throw new AppError('Usuário não encontrado', 400);
  }

  if (owner.role !== 'OFFICE_OWNER') {
    throw new AppError('Usuário deve ter role OFFICE_OWNER', 400);
  }

  return true;
};

// Schema base para validação de escritórios
const officeBaseSchema = z.object({
  number: z.string().min(1, 'Número é obrigatório'),
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  isActive: z.boolean().default(true),
});

// Schema para criação de escritório (ADMIN)
export const createOfficeSchema = officeBaseSchema.extend({
  ownerId: z.string().optional().refine(validateOwnerId, {
    message: 'ownerId inválido',
  }),
});

// Schema para atualização de escritório por ADMIN
export const updateOfficeAdminSchema = z.object({
  companyName: z.string().min(1, 'Nome da empresa é obrigatório').optional(),
  ownerId: z.string().optional().refine(validateOwnerId, {
    message: 'ownerId inválido',
  }),
});

// Schema para atualização de escritório por OFFICE_OWNER
export const updateOfficeOwnerSchema = z.object({
  companyName: z.string().min(1, 'Nome da empresa é obrigatório').optional(),
});

// Schema para query params
export const officeQuerySchema = z.object({
  page: z.string().optional().transform(Number).default('1'),
  perPage: z.string().optional().transform(Number).default('10'),
  q: z.string().optional(),
  isActive: z.string().optional().transform(val => val === 'true'),
  includeDeleted: z.string().optional().transform(val => val === 'true'),
});

// Tipos inferidos dos schemas
export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;
export type UpdateOfficeAdminInput = z.infer<typeof updateOfficeAdminSchema>;
export type UpdateOfficeOwnerInput = z.infer<typeof updateOfficeOwnerSchema>;
export type OfficeQueryInput = z.infer<typeof officeQuerySchema>;

// Projeções de dados
export const publicOfficeSelect = {
  id: true,
  number: true,
  companyName: true,
};

export const fullOfficeSelect = {
  id: true,
  number: true,
  companyName: true,
  ownerId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};