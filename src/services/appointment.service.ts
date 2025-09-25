import prisma from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateAppointmentInput, UpdateAppointmentInput } from '../schemas/appointment.schema';
import { UserRole } from '@prisma/client';

export const appointmentService = {
  // Criar appointment com visitor automático
  async create(data: CreateAppointmentInput) {
    const { officeId, scheduledAt, visitor } = data;
    const scheduledDate = new Date(scheduledAt);

    // Verificar se office existe e está ativo
    const office = await prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, isActive: true }
    });

    if (!office) {
      throw new AppError('Office não encontrado', 404);
    }

    if (!office.isActive) {
      throw new AppError('Office não está ativo', 400);
    }

    // Verificar se horário está dentro da disponibilidade
    const availability = await prisma.officeAvailability.findFirst({
      where: {
        officeId,
        availableFrom: { lte: scheduledDate },
        availableTo: { gte: scheduledDate }
      }
    });

    if (!availability) {
      throw new AppError('Horário não está disponível para este office', 400);
    }

    // Verificar se já existe appointment no mesmo horário
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        officeId,
        scheduledAt: scheduledDate,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (existingAppointment) {
      throw new AppError('Já existe um agendamento neste horário', 409);
    }

    // Buscar ou criar visitor
    let existingVisitor = await prisma.visitor.findUnique({
      where: { email: visitor.email }
    });

    if (!existingVisitor) {
      existingVisitor = await prisma.visitor.create({
        data: visitor
      });
    }

    // Criar appointment
    const appointment = await prisma.appointment.create({
      data: {
        officeId,
        visitorId: existingVisitor.id,
        scheduledAt: scheduledDate,
        status: 'PENDING'
      },
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      }
    });

    return appointment;
  },

  // Listar todos os appointments (ADMIN/ATTENDANT)
  async findAll() {
    const appointments = await prisma.appointment.findMany({
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return appointments;
  },

  // Listar appointments do OFFICE_OWNER
  async findByOfficeOwner(userId: string) {
    const userOffices = await prisma.office.findMany({
      where: { ownerId: userId },
      select: { id: true }
    });

    const officeIds = userOffices.map(office => office.id);
    
    const appointments = await prisma.appointment.findMany({
      where: {
        officeId: { in: officeIds }
      },
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return appointments;
  },

  // Listar appointments para VISITOR (todos para visualizar disponibilidade)
  async findAllForVisitor() {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return appointments;
  },

  // Método legado - manter compatibilidade
  async findAllByRole(userId: string, userRole: UserRole) {
    let whereClause = {};

    if (userRole === 'OFFICE_OWNER') {
      // OFFICE_OWNER só vê appointments do seu office
      const userOffices = await prisma.office.findMany({
        where: { ownerId: userId },
        select: { id: true }
      });

      const officeIds = userOffices.map(office => office.id);
      whereClause = {
        officeId: { in: officeIds }
      };
    }
    // ADMIN, ATTENDANT e VISITOR veem todos

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return appointments;
  },

  // Buscar appointment por ID
  async findById(id: string, userId?: string, userRole?: UserRole) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true,
            ownerId: true
          }
        }
      }
    });

    if (!appointment) {
      throw new AppError('Agendamento não encontrado', 404);
    }

    // Verificar permissões se userId e userRole foram fornecidos
    if (userId && userRole) {
      const canAccess = 
        userRole === 'ADMIN' ||
        userRole === 'ATTENDANT' ||
        (userRole === 'OFFICE_OWNER' && appointment.office.ownerId === userId);

      if (!canAccess) {
        throw new AppError('Acesso negado', 403);
      }
    }

    return appointment;
  },

  // Atualizar status do appointment
  async updateStatus(id: string, status: string, userId: string, userRole: UserRole) {
    const appointment = await this.findById(id);

    // Verificar permissões para atualização
    const canUpdate = 
      userRole === 'ADMIN' ||
      userRole === 'ATTENDANT' ||
      (userRole === 'OFFICE_OWNER' && appointment.office.ownerId === userId);

    if (!canUpdate) {
      throw new AppError('Você não tem permissão para atualizar este agendamento', 403);
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      }
    });

    return updatedAppointment;
  },

  // Método legado - manter compatibilidade
  async update(id: string, data: UpdateAppointmentInput, userId: string, userRole: UserRole) {
    const appointment = await this.findById(id);

    // Verificar permissões para atualização
    const canUpdate = 
      userRole === 'ADMIN' ||
      userRole === 'ATTENDANT' ||
      (userRole === 'OFFICE_OWNER' && appointment.office.ownerId === userId);

    if (!canUpdate) {
      throw new AppError('Você não tem permissão para atualizar este agendamento', 403);
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        visitor: true,
        office: {
          select: {
            id: true,
            number: true,
            companyName: true
          }
        }
      }
    });

    return updatedAppointment;
  }
};