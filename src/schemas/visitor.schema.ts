import { z } from 'zod';

export const visitorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email deve ter um formato válido'),
  whatsapp: z.string().min(1, 'WhatsApp é obrigatório')
});

export type VisitorInput = z.infer<typeof visitorSchema>;