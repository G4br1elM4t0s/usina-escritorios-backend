import { Request, Response, NextFunction } from 'express';
import { availabilityService } from '../services/availability.service';
import { createAvailabilitySchema } from '../schemas/availability.schema';
import { AppError } from '../middleware/errorHandler';

export const availabilityController = {
  // POST /api/offices/:id/availability - Criar disponibilidade (apenas OFFICE_OWNER)
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: officeId } = req.params;
      const { user } = req;
      
      if (!user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const validatedData = createAvailabilitySchema.parse(req.body);
      
      const availability = await availabilityService.create(officeId, validatedData, user.id);
      
      res.status(201).json({
        success: true,
        data: availability
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/offices/:id/availability - Listar disponibilidades (público)
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: officeId } = req.params;
      
      const availabilities = await availabilityService.findByOffice(officeId);
      
      res.json({
        success: true,
        data: availabilities
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/offices/:id/availability/:availId - Deletar disponibilidade (apenas OFFICE_OWNER)
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: officeId, availId: availabilityId } = req.params;
      const { user } = req;
      
      if (!user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const result = await availabilityService.delete(officeId, availabilityId, user.id);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};