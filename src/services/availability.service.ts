import prisma from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateAvailabilityInput } from '../schemas/availability.schema';

export const availabilityService = {
  // Criar disponibilidade (apenas OFFICE_OWNER)
  async create(officeId: string, data: CreateAvailabilityInput, userId: string) {
    const { availableFrom, availableTo } = data;
    const fromDate = new Date(availableFrom);
    const toDate = new Date(availableTo);

    // Verificar se office existe e se o usuário é o owner
    const office = await prisma.office.findUnique({
      where: { id: officeId },
      include: {
        owners: {
          where: { userId }
        }
      }
    });

    if (!office) {
      throw new AppError('Office não encontrado', 404);
    }

    if (office.owners.length === 0) {
      throw new AppError('Apenas o proprietário do office pode criar disponibilidade', 403);
    }

    if (!office.isActive) {
      throw new AppError('Office não está ativo', 400);
    }

    // Verificar se há sobreposição com outras disponibilidades
    const overlappingAvailability = await prisma.officeAvailability.findFirst({
      where: {
        officeId,
        OR: [
          {
            // Nova disponibilidade começa durante uma existente
            AND: [
              { availableFrom: { lte: fromDate } },
              { availableTo: { gt: fromDate } }
            ]
          },
          {
            // Nova disponibilidade termina durante uma existente
            AND: [
              { availableFrom: { lt: toDate } },
              { availableTo: { gte: toDate } }
            ]
          },
          {
            // Nova disponibilidade engloba uma existente
            AND: [
              { availableFrom: { gte: fromDate } },
              { availableTo: { lte: toDate } }
            ]
          },
          {
            // Uma existente engloba a nova
            AND: [
              { availableFrom: { lte: fromDate } },
              { availableTo: { gte: toDate } }
            ]
          }
        ]
      }
    });

    if (overlappingAvailability) {
      throw new AppError('Já existe uma disponibilidade que sobrepõe este período', 409);
    }

    const availability = await prisma.officeAvailability.create({
      data: {
        officeId,
        availableFrom: fromDate,
        availableTo: toDate
      }
    });

    return availability;
  },

  // Listar disponibilidades de um office (público)
  async findByOffice(officeId: string) {
    // Verificar se office existe
    const office = await prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true }
    });

    if (!office) {
      throw new AppError('Office não encontrado', 404);
    }

    const availabilities = await prisma.officeAvailability.findMany({
      where: { officeId },
      orderBy: { availableFrom: 'asc' }
    });

    return availabilities;
  },

  // Deletar disponibilidade (apenas OFFICE_OWNER)
  async delete(officeId: string, availabilityId: string, userId: string) {
    // Verificar se office existe e se o usuário é o owner
    const office = await prisma.office.findUnique({
      where: { id: officeId },
      include: {
        owners: {
          where: { userId }
        }
      }
    });

    if (!office) {
      throw new AppError('Office não encontrado', 404);
    }

    if (office.owners.length === 0) {
      throw new AppError('Apenas o proprietário do office pode deletar disponibilidade', 403);
    }

    // Verificar se a disponibilidade existe e pertence ao office
    const availability = await prisma.officeAvailability.findFirst({
      where: {
        id: availabilityId,
        officeId
      }
    });

    if (!availability) {
      throw new AppError('Disponibilidade não encontrada', 404);
    }

    await prisma.officeAvailability.delete({
      where: { id: availabilityId }
    });

    return { message: 'Disponibilidade removida com sucesso' };
  }
};