import { Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointment.service';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas/appointment.schema';
import { AppError } from '../middleware/errorHandler';
import { UserRole, AppointmentStatus } from '@prisma/client';

export const appointmentController = {
  // POST /api/appointments - Criar appointment
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);
      
      const appointment = await appointmentService.create(validatedData);
      
      res.status(201).json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/appointments - Listar appointments baseado no role
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      
      if (!user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      let appointments;

      switch (user.role) {
        case UserRole.ADMIN:
        case UserRole.ATTENDANT:
          // Admin e Attendant podem ver todos os appointments
          appointments = await appointmentService.findAll();
          break;
          
        case UserRole.OFFICE_OWNER:
          // Office Owner pode ver apenas appointments do seu office
          appointments = await appointmentService.findByOfficeOwner(user.id);
          break;
          
        case UserRole.VISITOR:
          // Visitor pode ver todos os appointments (para visualizar disponibilidade)
          appointments = await appointmentService.findAllForVisitor();
          break;
          
        default:
          throw new AppError('Role não autorizado', 403);
      }
      
      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/appointments/:id - Detalhar appointment
  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { user } = req;
      
      if (!user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const appointment = await appointmentService.findById(id, user.id, user.role);
      
      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/appointments/:id - Atualizar status do appointment
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { user } = req;
      
      if (!user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      const validatedData = updateAppointmentSchema.parse(req.body);
      
      const appointment = await appointmentService.updateStatus(
        id,
        validatedData.status as AppointmentStatus,
        user.id,
        user.role
      );
      
      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }
};