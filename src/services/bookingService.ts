import { PrismaClient, BookingStatus, UserRole, Booking, Visitor } from '@prisma/client';
import { CreateBookingDTO, UpdateBookingDTO, ListBookingsQuery } from '../schemas/bookingSchema';
import prisma from '../prisma/client';

export class BookingService {
  
  /**
   * Cria um novo booking com validações de negócio
   */
  async createBooking(data: CreateBookingDTO, createdByUserId?: string): Promise<Booking> {
    const { officeId, startAt, endAt, visitor, visitorId, visitorName, visitorEmail, visitorWhatsapp, ...bookingData } = data;
    
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    
    // 1. Verificar se o office existe e está ativo
    const office = await prisma.office.findFirst({
      where: {
        id: officeId,
        isActive: true,
        deletedAt: null
      }
    });
    
    if (!office) {
      throw new Error('Office não encontrado ou inativo');
    }
    
    // 2. Verificar se o intervalo está dentro de uma disponibilidade
    await this.validateAvailability(officeId, startDate, endDate);
    
    // 3. Verificar conflitos com outros bookings
    await this.validateBookingConflicts(officeId, startDate, endDate);
    
    // 4. Resolver ou criar visitor
    let resolvedVisitorId = visitorId;
    
    if (!resolvedVisitorId) {
      if (visitor) {
        // Tentar encontrar visitor existente por email
        if (visitor.email) {
          const existingVisitor = await prisma.visitor.findFirst({
            where: { email: visitor.email }
          });
          
          if (existingVisitor) {
            resolvedVisitorId = existingVisitor.id;
          } else {
            // Criar novo visitor
            const newVisitor = await prisma.visitor.create({
              data: visitor
            });
            resolvedVisitorId = newVisitor.id;
          }
        } else {
          // Criar visitor sem email
          const newVisitor = await prisma.visitor.create({
            data: visitor
          });
          resolvedVisitorId = newVisitor.id;
        }
      }
    }
    
    // 5. Criar o booking
    const booking = await prisma.booking.create({
      data: {
        ...bookingData,
        officeId,
        startAt: startDate,
        endAt: endDate,
        visitorId: resolvedVisitorId,
        visitorName: visitorName || visitor?.name,
        visitorEmail: visitorEmail || visitor?.email,
        visitorWhatsapp: visitorWhatsapp || visitor?.whatsapp,
        createdByUserId: createdByUserId || 'system',
        status: BookingStatus.REQUESTED
      },
      include: {
        visitor: true,
        office: true,
        createdBy: true
      }
    });
    
    return booking;
  }
  
  /**
   * Lista bookings com filtros e permissões por role
   */
  async listBookings(
    query: ListBookingsQuery, 
    userRole?: UserRole, 
    userId?: string
  ): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    const { page, limit, officeId, status, startDate, endDate, visitorEmail } = query;
    const skip = (page - 1) * limit;
    
    let whereClause: any = {
      deletedAt: null
    };
    
    // Filtros básicos
    if (officeId) whereClause.officeId = officeId;
    if (status) whereClause.status = status;
    if (visitorEmail) {
      whereClause.OR = [
        { visitorEmail: { contains: visitorEmail, mode: 'insensitive' } },
        { visitor: { email: { contains: visitorEmail, mode: 'insensitive' } } }
      ];
    }
    
    // Filtros de data
    if (startDate || endDate) {
      whereClause.AND = [];
      if (startDate) {
        whereClause.AND.push({ startAt: { gte: new Date(startDate) } });
      }
      if (endDate) {
        whereClause.AND.push({ endAt: { lte: new Date(endDate) } });
      }
    }
    
    // Aplicar permissões por role
    if (userRole === UserRole.OFFICE_OWNER && userId) {
      // Office owners só veem bookings dos seus offices
      const userOffices = await prisma.officeOwner.findMany({
        where: { userId },
        select: { officeId: true }
      });
      
      const officeIds = userOffices.map(uo => uo.officeId);
      whereClause.officeId = { in: officeIds };
    }
    
    // Definir campos de retorno baseado no role
    let selectFields: any = {
      id: true,
      officeId: true,
      startAt: true,
      endAt: true,
      status: true,
      title: true,
      description: true,
      needsSupport: true,
      notes: true,
      visitorName: true,
      visitorEmail: true,
      visitorWhatsapp: true,
      createdAt: true,
      updatedAt: true,
      office: {
        select: {
          number: true,
          companyName: true
        }
      },
      visitor: {
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true
        }
      }
    };
    
    // Para visitantes públicos, limitar campos
    if (!userRole) {
      selectFields = {
        id: true,
        officeId: true,
        startAt: true,
        endAt: true,
        status: true,
        visitorName: true,
        office: {
          select: {
            number: true,
            companyName: true
          }
        }
      };
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereClause,
        select: selectFields,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' }
      }),
      prisma.booking.count({ where: whereClause })
    ]);
    
    return {
      bookings,
      total,
      page,
      limit
    };
  }
  
  /**
   * Busca booking por ID com validações de permissão
   */
  async getBookingById(
    id: string, 
    userRole?: UserRole, 
    userId?: string,
    visitorEmail?: string
  ): Promise<Booking | null> {
    let whereClause: any = {
      id,
      deletedAt: null
    };
    
    // Aplicar filtros de permissão
    if (userRole === UserRole.OFFICE_OWNER && userId) {
      const userOffices = await prisma.officeOwner.findMany({
        where: { userId },
        select: { officeId: true }
      });
      
      const officeIds = userOffices.map(uo => uo.officeId);
      whereClause.officeId = { in: officeIds };
    } else if (!userRole && visitorEmail) {
      // Visitante público só vê seus próprios bookings
      whereClause.OR = [
        { visitorEmail },
        { visitor: { email: visitorEmail } }
      ];
    }
    
    const booking = await prisma.booking.findFirst({
      where: whereClause,
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return booking;
  }
  
  /**
   * Atualiza booking com validações de permissão
   */
  async updateBooking(
    id: string,
    data: UpdateBookingDTO,
    userRole: UserRole,
    userId: string,
    visitorEmail?: string
  ): Promise<Booking> {
    const booking = await this.getBookingById(id, userRole, userId, visitorEmail);
    
    if (!booking) {
      throw new Error('Booking não encontrado ou sem permissão');
    }
    
    // Validar permissões para mudança de status
    if (data.status) {
      await this.validateStatusChange(booking, data.status, userRole, userId, visitorEmail);
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data,
      include: {
        visitor: true,
        office: true,
        createdBy: true
      }
    });
    
    return updatedBooking;
  }
  
  /**
   * Valida se o intervalo está dentro de uma disponibilidade
   */
  private async validateAvailability(officeId: string, startAt: Date, endAt: Date): Promise<void> {
    const availability = await prisma.officeAvailability.findFirst({
      where: {
        officeId,
        availableFrom: { lte: startAt },
        availableTo: { gte: endAt }
      }
    });
    
    if (!availability) {
      throw new Error('Horário solicitado não está disponível para este office');
    }
  }
  
  /**
   * Valida conflitos com outros bookings
   */
  private async validateBookingConflicts(officeId: string, startAt: Date, endAt: Date, excludeId?: string): Promise<void> {
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        officeId,
        status: { in: [BookingStatus.REQUESTED, BookingStatus.CONFIRMED] },
        deletedAt: null,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          {
            startAt: { lt: endAt },
            endAt: { gt: startAt }
          }
        ]
      }
    });
    
    if (conflictingBooking) {
      throw new Error('Já existe um agendamento confirmado ou solicitado neste horário');
    }
  }
  
  /**
   * Valida mudanças de status baseado no role
   */
  private async validateStatusChange(
    booking: any,
    newStatus: BookingStatus,
    userRole: UserRole,
    userId: string,
    visitorEmail?: string
  ): Promise<void> {
    switch (newStatus) {
      case BookingStatus.CONFIRMED:
        if (![UserRole.ADMIN, UserRole.ATTENDANT].includes(userRole as any)) {
          // Verificar se é office owner
          if (userRole === UserRole.OFFICE_OWNER) {
            const isOwner = await prisma.officeOwner.findFirst({
              where: {
                userId,
                officeId: booking.officeId
              }
            });
            if (!isOwner) {
              throw new Error('Apenas proprietários do office podem confirmar agendamentos');
            }
          } else {
            throw new Error('Sem permissão para confirmar agendamentos');
          }
        }
        break;
        
      case BookingStatus.CANCELLED:
        if (![UserRole.ADMIN, UserRole.ATTENDANT].includes(userRole as any)) {
          if (userRole === UserRole.OFFICE_OWNER) {
            const isOwner = await prisma.officeOwner.findFirst({
              where: {
                userId,
                officeId: booking.officeId
              }
            });
            if (!isOwner) {
              throw new Error('Apenas proprietários do office podem cancelar agendamentos');
            }
          } else if (!userRole && visitorEmail) {
            // Visitante pode cancelar apenas seus próprios bookings
            if (booking.visitorEmail !== visitorEmail && booking.visitor?.email !== visitorEmail) {
              throw new Error('Você só pode cancelar seus próprios agendamentos');
            }
          } else {
            throw new Error('Sem permissão para cancelar agendamentos');
          }
        }
        break;
        
      case BookingStatus.COMPLETED:
        if (![UserRole.ADMIN, UserRole.ATTENDANT].includes(userRole as any)) {
          throw new Error('Apenas administradores e atendentes podem marcar como concluído');
        }
        break;
        
      default:
        throw new Error('Status inválido');
    }
  }
}

export const bookingService = new BookingService();