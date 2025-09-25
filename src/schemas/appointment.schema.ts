import { z } from 'zod';
import { visitorSchema } from './visitor.schema';

export const createAppointmentSchema = z.object({
  officeId: z.string().cuid('OfficeId deve ser um CUID válido'),
  scheduledAt: z.string().datetime('ScheduledAt deve ser uma data válida'),
  visitor: visitorSchema
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], {
    errorMap: () => ({ message: 'Status deve ser PENDING, CONFIRMED, CANCELLED ou COMPLETED' })
  })
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;