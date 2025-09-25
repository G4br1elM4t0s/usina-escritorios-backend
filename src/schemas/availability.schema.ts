import { z } from 'zod';

export const createAvailabilitySchema = z.object({
  availableFrom: z.string().datetime('AvailableFrom deve ser uma data válida'),
  availableTo: z.string().datetime('AvailableTo deve ser uma data válida')
}).refine(
  (data) => new Date(data.availableTo) > new Date(data.availableFrom),
  {
    message: 'AvailableTo deve ser maior que AvailableFrom',
    path: ['availableTo']
  }
);

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;