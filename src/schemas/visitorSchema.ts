import { z } from 'zod';

// Schema para criação de Visitor
export const createVisitorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email deve ter formato válido').optional(),
  phone: z.string().min(8, 'Telefone deve ter pelo menos 8 caracteres').optional(),
  document: z.string().optional(),
  company: z.string().optional()
});

// Schema para atualização de Visitor
export const updateVisitorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email deve ter formato válido').optional(),
  phone: z.string().min(8, 'Telefone deve ter pelo menos 8 caracteres').optional(),
  document: z.string().optional(),
  company: z.string().optional()
});

// Tipos TypeScript derivados dos schemas
export type CreateVisitorDTO = z.infer<typeof createVisitorSchema>;
export type UpdateVisitorDTO = z.infer<typeof updateVisitorSchema>;