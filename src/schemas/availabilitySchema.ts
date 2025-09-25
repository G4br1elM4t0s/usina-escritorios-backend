import { z } from 'zod';

// Schema para criação de OfficeAvailability
export const createAvailabilitySchema = z.object({
  startTime: z.string().datetime('Data de início deve ser um datetime válido (ISO)'),
  endTime: z.string().datetime('Data de fim deve ser um datetime válido (ISO)'),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  recurringEndDate: z.string().datetime().optional(),
  notes: z.string().optional()
}).refine(
  (data) => {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    return endTime > startTime;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endTime']
  }
);

// Schema para atualização de OfficeAvailability
export const updateAvailabilitySchema = z.object({
  startTime: z.string().datetime('Data de início deve ser um datetime válido (ISO)').optional(),
  endTime: z.string().datetime('Data de fim deve ser um datetime válido (ISO)').optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  recurringEndDate: z.string().datetime().optional(),
  notes: z.string().optional()
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      return endTime > startTime;
    }
    return true;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['endTime']
  }
);

// Schema para query parameters de listagem
export const listAvailabilityQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Tipos TypeScript derivados dos schemas
export type CreateAvailabilityDTO = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityDTO = z.infer<typeof updateAvailabilitySchema>;
export type ListAvailabilityQuery = z.infer<typeof listAvailabilityQuerySchema>;