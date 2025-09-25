import { Request, Response, NextFunction } from 'express';
import { availabilityService } from '../services/availabilityService';
import { createAvailabilitySchema, updateAvailabilitySchema, listAvailabilityQuerySchema } from '../schemas/availabilitySchema';


// Note: Request type is extended globally in authMiddleware.ts

export class AvailabilityController {
  
  /**
   * POST /api/offices/:id/availability - Cria nova disponibilidade
   */
  async createAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Autenticação necessária'
        });
        return;
      }
      
      // Validar dados de entrada
      const validatedData = createAvailabilitySchema.parse(req.body);
      
      const availability = await availabilityService.createAvailability(
        officeId,
        validatedData,
        req.user.id,
        req.user.role
      );
      
      res.status(201).json({
        success: true,
        message: 'Disponibilidade criada com sucesso',
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/offices/:id/availability - Lista disponibilidades (público)
   */
  async listAvailabilities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId } = req.params;
      
      // Validar query parameters
      const query = listAvailabilityQuerySchema.parse(req.query);
      
      const result = await availabilityService.listAvailabilities(officeId, query);
      
      res.json({
        success: true,
        message: 'Disponibilidades listadas com sucesso',
        data: result.availabilities,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/offices/:id/availability/:availId - Busca disponibilidade por ID
   */
  async getAvailabilityById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId, availId } = req.params;
      
      const availability = await availabilityService.getAvailabilityById(officeId, availId);
      
      if (!availability) {
        res.status(404).json({
          success: false,
          message: 'Disponibilidade não encontrada'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Disponibilidade encontrada',
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PUT /api/offices/:id/availability/:availId - Atualiza disponibilidade
   */
  async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId, availId } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Autenticação necessária'
        });
        return;
      }
      
      // Validar dados de entrada
      const validatedData = updateAvailabilitySchema.parse(req.body);
      
      const availability = await availabilityService.updateAvailability(
        officeId,
        availId,
        validatedData,
        req.user.id,
        req.user.role
      );
      
      res.json({
        success: true,
        message: 'Disponibilidade atualizada com sucesso',
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/offices/:id/availability/:availId - Remove disponibilidade
   */
  async deleteAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId, availId } = req.params;
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Autenticação necessária'
        });
        return;
      }
      
      await availabilityService.deleteAvailability(
        officeId,
        availId,
        req.user.id,
        req.user.role
      );
      
      res.json({
        success: true,
        message: 'Disponibilidade removida com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/offices/:id/availability/slots - Busca slots disponíveis
   */
  async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId } = req.params;
      const { startDate, endDate, duration } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate e endDate são obrigatórios'
        });
        return;
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const durationMinutes = duration ? parseInt(duration as string) : 60;
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Datas inválidas'
        });
        return;
      }
      
      if (end <= start) {
        res.status(400).json({
          success: false,
          message: 'Data de fim deve ser posterior à data de início'
        });
        return;
      }
      
      const slots = await availabilityService.getAvailableSlots(
        officeId,
        start,
        end,
        durationMinutes
      );
      
      res.json({
        success: true,
        message: 'Slots disponíveis encontrados',
        data: {
          slots,
          totalSlots: slots.length,
          searchPeriod: {
            startDate: start,
            endDate: end,
            duration: durationMinutes
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/offices/:id/availability/calendar - Visualização de calendário
   */
  async getCalendarView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: officeId } = req.params;
      const { month, year } = req.query;
      
      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'month e year são obrigatórios'
        });
        return;
      }
      
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      
      if (monthNum < 1 || monthNum > 12 || yearNum < 2020) {
        res.status(400).json({
          success: false,
          message: 'Mês deve estar entre 1-12 e ano deve ser válido'
        });
        return;
      }
      
      // Primeiro e último dia do mês
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);
      
      // Buscar disponibilidades do mês
      const availabilities = await availabilityService.listAvailabilities(officeId, {
        page: 1,
        limit: 100,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Buscar slots disponíveis
      const slots = await availabilityService.getAvailableSlots(
        officeId,
        startDate,
        endDate,
        60 // 1 hora por padrão
      );
      
      res.json({
        success: true,
        message: 'Calendário carregado com sucesso',
        data: {
          month: monthNum,
          year: yearNum,
          availabilities: availabilities.availabilities,
          availableSlots: slots,
          summary: {
            totalAvailabilities: availabilities.total,
            totalSlots: slots.length
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const availabilityController = new AvailabilityController();