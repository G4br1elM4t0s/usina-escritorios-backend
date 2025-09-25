import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/bookingService';
import { createBookingSchema, updateBookingSchema, listBookingsQuerySchema } from '../schemas/bookingSchema';
import { UserRole } from '@prisma/client';

// Note: Request type is extended globally in authMiddleware.ts

interface PublicBookingRequest extends Request {
  query: {
    visitorEmail?: string;
  };
}

export class BookingController {
  
  /**
   * POST /api/bookings - Cria um novo booking (público)
   */
  async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar dados de entrada
      const validatedData = createBookingSchema.parse(req.body);
      
      // Extrair userId se autenticado
      const createdByUserId = req.user?.id;
      
      const booking = await bookingService.createBooking(validatedData, createdByUserId);
      
      res.status(201).json({
        success: true,
        message: 'Agendamento criado com sucesso',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/bookings - Lista bookings com filtros e permissões
   */
  async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar query parameters
      const query = listBookingsQuerySchema.parse(req.query);
      
      // Extrair informações do usuário se autenticado
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      const result = await bookingService.listBookings(query, userRole, userId);
      
      res.json({
        success: true,
        message: 'Agendamentos listados com sucesso',
        data: result.bookings,
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
   * GET /api/bookings/:id - Busca booking por ID
   */
  async getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Extrair informações do usuário se autenticado
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      // Para visitantes públicos, extrair email da query
      const publicReq = req as PublicBookingRequest;
      const visitorEmail = publicReq.query.visitorEmail;
      
      const booking = await bookingService.getBookingById(id, userRole, userId, visitorEmail);
      
      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Agendamento não encontrado ou sem permissão para visualizar'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Agendamento encontrado',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PUT /api/bookings/:id - Atualiza booking
   */
  async updateBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Validar dados de entrada
      const validatedData = updateBookingSchema.parse(req.body);
      
      // Extrair informações do usuário
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      // Para visitantes públicos, extrair email da query
      const publicReq = req as PublicBookingRequest;
      const visitorEmail = publicReq.query.visitorEmail;
      
      // Verificar se tem permissão (usuário autenticado ou visitante com email)
      if (!userRole && !visitorEmail) {
        res.status(401).json({
          success: false,
          message: 'Autenticação necessária ou informe o email do visitante'
        });
        return;
      }
      
      const booking = await bookingService.updateBooking(
        id,
        validatedData,
        userRole!,
        userId!,
        visitorEmail
      );
      
      res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * DELETE /api/bookings/:id - Não permitido (soft delete via status)
   */
  async deleteBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    res.status(405).json({
      success: false,
      message: 'Deleção física não permitida. Use PUT para alterar status para CANCELLED'
    });
  }
  
  /**
   * GET /api/bookings/my - Lista bookings do visitante (público)
   */
  async getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { visitorEmail } = req.query;
      
      if (!visitorEmail || typeof visitorEmail !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Email do visitante é obrigatório'
        });
        return;
      }
      
      // Validar query parameters
      const query = listBookingsQuerySchema.parse({
        ...req.query,
        visitorEmail
      });
      
      const result = await bookingService.listBookings(query);
      
      // Filtrar apenas bookings do visitante
      const visitorBookings = result.bookings.filter(booking => 
        booking.visitorEmail === visitorEmail || 
        booking.visitor?.email === visitorEmail
      );
      
      res.json({
        success: true,
        message: 'Seus agendamentos listados com sucesso',
        data: visitorBookings,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: visitorBookings.length,
          totalPages: Math.ceil(visitorBookings.length / result.limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/bookings/:id/cancel - Cancela booking (público)
   */
  async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { visitorEmail } = req.body;
      
      if (!visitorEmail) {
        res.status(400).json({
          success: false,
          message: 'Email do visitante é obrigatório para cancelamento'
        });
        return;
      }
      
      // Usar o updateBooking com status CANCELLED
      const booking = await bookingService.updateBooking(
        id,
        { status: 'CANCELLED' as any },
        undefined as any, // userRole
        undefined as any, // userId
        visitorEmail
      );
      
      res.json({
        success: true,
        message: 'Agendamento cancelado com sucesso',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/bookings/:id/confirm - Confirma booking (apenas autenticados)
   */
  async confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userRole || !userId) {
        res.status(401).json({
          success: false,
          message: 'Autenticação necessária'
        });
        return;
      }
      
      const booking = await bookingService.updateBooking(
        id,
        { status: 'CONFIRMED' as any },
        userRole,
        userId
      );
      
      res.json({
        success: true,
        message: 'Agendamento confirmado com sucesso',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * POST /api/bookings/:id/complete - Marca como concluído (apenas ADMIN/ATTENDANT)
   */
  async completeBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userRole || !userId) {
        res.status(401).json({
          success: false,
          message: 'Autenticação necessária'
        });
        return;
      }
      
      if (![UserRole.ADMIN, UserRole.ATTENDANT].includes(userRole as any)) {
        res.status(403).json({
          success: false,
          message: 'Apenas administradores e atendentes podem marcar como concluído'
        });
        return;
      }
      
      const booking = await bookingService.updateBooking(
        id,
        { status: 'COMPLETED' as any },
        userRole,
        userId
      );
      
      res.json({
        success: true,
        message: 'Agendamento marcado como concluído',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();