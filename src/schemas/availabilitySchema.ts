import { z } from 'zod';

// Schema para criação de OfficeAvailability
export const createAvailabilitySchema = z.object({
  availableFrom: z.string().datetime('Data de início deve ser um datetime válido (ISO)'),
  availableTo: z.string().datetime('Data de fim deve ser um datetime válido (ISO)')
}).refine(
  (data) => {
    const availableFrom = new Date(data.availableFrom);
    const availableTo = new Date(data.availableTo);
    return availableTo > availableFrom;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['availableTo']
  }
);

// Schema para atualização de OfficeAvailability
export const updateAvailabilitySchema = z.object({
  availableFrom: z.string().datetime('Data de início deve ser um datetime válido (ISO)').optional(),
  availableTo: z.string().datetime('Data de fim deve ser um datetime válido (ISO)').optional()
}).refine(
  (data) => {
    if (data.availableFrom && data.availableTo) {
      const availableFrom = new Date(data.availableFrom);
      const availableTo = new Date(data.availableTo);
      return availableTo > availableFrom;
    }
    return true;
  },
  {
    message: 'Data de fim deve ser posterior à data de início',
    path: ['availableTo']
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