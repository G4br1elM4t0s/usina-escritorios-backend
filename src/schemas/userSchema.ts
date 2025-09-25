import { z } from 'zod';
import { UserRole } from '@prisma/client';

// Schema base para validação de usuários (sem senha)
const userBaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.nativeEnum(UserRole).default('ATTENDANT'),
  isActive: z.boolean().default(true),
});

// Schema para criação de usuário (inclui senha)
export const createUserSchema = userBaseSchema.extend({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

// Schema para atualização de usuário (todos os campos são opcionais)
export const updateUserSchema = userBaseSchema.partial();

// Schema para resposta (remove campos sensíveis)
export const userResponseSchema = userBaseSchema
  .extend({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  });

// Tipos inferidos dos schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;