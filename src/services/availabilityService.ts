import { PrismaClient, UserRole, OfficeAvailability } from '@prisma/client';
import { CreateAvailabilityDTO, UpdateAvailabilityDTO, ListAvailabilityQuery } from '../schemas/availabilitySchema';
import prisma from '../prisma/client';

export class AvailabilityService {
  
  /**
   * Cria uma nova disponibilidade para um office
   */
  async createAvailability(
    officeId: string,
    data: CreateAvailabilityDTO,
    userId: string,
    userRole: UserRole
  ): Promise<OfficeAvailability> {
    // Verificar permissões - apenas OFFICE_OWNER pode criar
    await this.validateOfficeOwnership(officeId, userId, userRole);
    
    const availableFrom = new Date(data.availableFrom);
    const availableTo = new Date(data.availableTo);
    
    // Verificar se o office existe e está ativo
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
    
    // Verificar sobreposições com outras disponibilidades
    await this.validateOverlap(officeId, availableFrom, availableTo);
    
    const availability = await prisma.officeAvailability.create({
      data: {
        officeId,
        availableFrom,
        availableTo
      },
      include: {
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      }
    });
    
    return availability;
  }
  
  /**
   * Lista disponibilidades de um office
   */
  async listAvailabilities(
    officeId: string,
    query: ListAvailabilityQuery
  ): Promise<{ availabilities: OfficeAvailability[]; total: number; page: number; limit: number }> {
    const { page, limit, startDate, endDate } = query;
    const skip = (page - 1) * limit;
    
    let whereClause: any = {
      officeId
    };
    
    // Filtros de data
    if (startDate || endDate) {
      whereClause.AND = [];
      if (startDate) {
        whereClause.AND.push({ availableTo: { gte: new Date(startDate) } });
      }
      if (endDate) {
        whereClause.AND.push({ availableFrom: { lte: new Date(endDate) } });
      }
    }
    
    const [availabilities, total] = await Promise.all([
      prisma.officeAvailability.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { availableFrom: 'asc' },
        include: {
          office: {
            select: {
              id: true,
              number: true,
              companyName: true
            }
          }
        }
      }),
      prisma.officeAvailability.count({ where: whereClause })
    ]);
    
    return {
      availabilities,
      total,
      page,
      limit
    };
  }
  
  /**
   * Busca disponibilidade por ID
   */
  async getAvailabilityById(
    officeId: string,
    availabilityId: string
  ): Promise<OfficeAvailability | null> {
    const availability = await prisma.officeAvailability.findFirst({
      where: {
        id: availabilityId,
        officeId
      },
      include: {
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      }
    });
    
    return availability;
  }
  
  /**
   * Atualiza uma disponibilidade
   */
  async updateAvailability(
    officeId: string,
    availabilityId: string,
    data: UpdateAvailabilityDTO,
    userId: string,
    userRole: UserRole
  ): Promise<OfficeAvailability> {
    // Verificar permissões
    await this.validateOfficeOwnership(officeId, userId, userRole);
    
    const existingAvailability = await this.getAvailabilityById(officeId, availabilityId);
    
    if (!existingAvailability) {
      throw new Error('Disponibilidade não encontrada');
    }
    
    // Se estiver alterando datas, validar sobreposições
    if (data.availableFrom || data.availableTo) {
      const availableFrom = data.availableFrom ? new Date(data.availableFrom) : existingAvailability.availableFrom;
      const availableTo = data.availableTo ? new Date(data.availableTo) : existingAvailability.availableTo;
      
      await this.validateOverlap(officeId, availableFrom, availableTo, availabilityId);
    }
    
    const updatedData: any = {};
    if (data.availableFrom) updatedData.availableFrom = new Date(data.availableFrom);
    if (data.availableTo) updatedData.availableTo = new Date(data.availableTo);
    
    const availability = await prisma.officeAvailability.update({
      where: { id: availabilityId },
      data: updatedData,
      include: {
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      }
    });
    
    return availability;
  }
  
  /**
   * Remove uma disponibilidade
   */
  async deleteAvailability(
    officeId: string,
    availabilityId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    // Verificar permissões
    await this.validateOfficeOwnership(officeId, userId, userRole);
    
    const availability = await this.getAvailabilityById(officeId, availabilityId);
    
    if (!availability) {
      throw new Error('Disponibilidade não encontrada');
    }
    
    // Verificar se há bookings dependentes desta disponibilidade
    const dependentBookings = await prisma.booking.findFirst({
      where: {
        officeId,
        startAt: { gte: availability.availableFrom },
        endAt: { lte: availability.availableTo },
        status: { in: ['REQUESTED', 'CONFIRMED'] },
        deletedAt: null
      }
    });
    
    if (dependentBookings) {
      throw new Error('Não é possível remover disponibilidade com agendamentos ativos');
    }
    
    await prisma.officeAvailability.delete({
      where: { id: availabilityId }
    });
  }
  
  /**
   * Busca slots disponíveis para agendamento
   */
  async getAvailableSlots(
    officeId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60 // duração em minutos
  ): Promise<{ start: Date; end: Date }[]> {
    // Buscar todas as disponibilidades no período
    const availabilities = await prisma.officeAvailability.findMany({
      where: {
        officeId,
        availableFrom: { lte: endDate },
        availableTo: { gte: startDate }
      },
      orderBy: { availableFrom: 'asc' }
    });
    
    // Buscar todos os bookings confirmados no período
    const bookings = await prisma.booking.findMany({
      where: {
        officeId,
        status: { in: ['REQUESTED', 'CONFIRMED'] },
        startAt: { lte: endDate },
        endAt: { gte: startDate },
        deletedAt: null
      },
      orderBy: { startAt: 'asc' }
    });
    
    const slots: { start: Date; end: Date }[] = [];
    
    for (const availability of availabilities) {
      const availStart = new Date(Math.max(availability.availableFrom.getTime(), startDate.getTime()));
      const availEnd = new Date(Math.min(availability.availableTo.getTime(), endDate.getTime()));
      
      // Encontrar bookings que intersectam com esta disponibilidade
      const intersectingBookings = bookings.filter(booking => 
        booking.startAt < availEnd && booking.endAt > availStart
      );
      
      if (intersectingBookings.length === 0) {
        // Toda a disponibilidade está livre
        slots.push({ start: availStart, end: availEnd });
      } else {
        // Calcular slots entre os bookings
        let currentStart = availStart;
        
        for (const booking of intersectingBookings.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())) {
          if (currentStart < booking.startAt) {
            slots.push({ start: currentStart, end: booking.startAt });
          }
          currentStart = new Date(Math.max(currentStart.getTime(), booking.endAt.getTime()));
        }
        
        // Slot após o último booking
        if (currentStart < availEnd) {
          slots.push({ start: currentStart, end: availEnd });
        }
      }
    }
    
    // Filtrar slots que atendem à duração mínima
    return slots.filter(slot => 
      (slot.end.getTime() - slot.start.getTime()) >= (duration * 60 * 1000)
    );
  }
  
  /**
   * Valida se o usuário é proprietário do office
   */
  private async validateOfficeOwnership(
    officeId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    // ADMIN pode gerenciar qualquer office
    if (userRole === UserRole.ADMIN) {
      return;
    }
    
    // OFFICE_OWNER só pode gerenciar seus próprios offices
    if (userRole === UserRole.OFFICE_OWNER) {
      const ownership = await prisma.officeOwner.findFirst({
        where: {
          officeId,
          userId
        }
      });
      
      if (!ownership) {
        throw new Error('Você não tem permissão para gerenciar este office');
      }
      return;
    }
    
    throw new Error('Apenas proprietários de office podem gerenciar disponibilidades');
  }
  
  /**
   * Valida sobreposições com outras disponibilidades
   */
  private async validateOverlap(
    officeId: string,
    availableFrom: Date,
    availableTo: Date,
    excludeId?: string
  ): Promise<void> {
    const overlapping = await prisma.officeAvailability.findFirst({
      where: {
        officeId,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          {
            availableFrom: { lt: availableTo },
            availableTo: { gt: availableFrom }
          }
        ]
      }
    });
    
    if (overlapping) {
      throw new Error('Já existe uma disponibilidade que sobrepõe este horário');
    }
  }
}

export const availabilityService = new AvailabilityService();