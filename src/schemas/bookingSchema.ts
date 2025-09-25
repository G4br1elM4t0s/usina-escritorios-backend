import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { createVisitorSchema } from './visitorSchema';

// Schema para criação de Booking
export const createBookingSchema = z.object({
  officeId: z.string().cuid('Office ID deve ser um CUID válido'),
  startAt: z.string().datetime('Data de início deve ser um datetime válido (ISO)'),
  endAt: z.string().datetime('Data de fim deve ser um datetime válido (ISO)'),
  title: z.string().optional(),
  description: z.string().optional(),
  needsSupport: z.boolean().optional(),
  notes: z.string().optional(),
  
  // Visitor pode ser criado inline ou referenciado por ID
  visitor: createVisitorSchema.optional(),
  visitorId: z.string().cuid().optional(),
  
  // Snapshot de contato (permite agendar sem Visitor cadastrado)
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  visitorWhatsapp: z.string().optional()
}).refine(
  (data) => {
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    return endAt > startAt;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endAt']
  }
).refine(
  (data) => {
    // Deve ter visitor OU visitorId OU snapshot de contato
    return data.visitor || data.visitorId || (data.visitorName && (data.visitorEmail || data.visitorWhatsapp));
  },
  {
    message: 'Deve informar dados do visitante (visitor, visitorId ou snapshot de contato)',
    path: ['visitor']
  }
);

// Schema para atualização de Booking
export const updateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    errorMap: () => ({ message: 'Status deve ser REQUESTED, CONFIRMED, CANCELLED ou COMPLETED' })
  }).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  needsSupport: z.boolean().optional(),
  notes: z.string().optional(),
  
  // Campos de snapshot podem ser atualizados
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  visitorWhatsapp: z.string().optional()
});

// Schema para query parameters de listagem
export const listBookingsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  officeId: z.string().cuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  visitorEmail: z.string().email().optional()
});

// Tipos TypeScript derivados dos schemas
export type CreateBookingDTO = z.infer<typeof createBookingSchema>;
export type UpdateBookingDTO = z.infer<typeof updateBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;