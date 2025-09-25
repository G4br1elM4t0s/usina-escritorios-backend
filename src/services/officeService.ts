import prisma from '../prisma/client';
import { AppError } from '../middleware/errorHandler';
import { CreateOfficeInput, UpdateOfficeAdminInput, UpdateOfficeOwnerInput, OfficeQueryInput, publicOfficeSelect, fullOfficeSelect } from '../schemas/officeSchema';
import { UserRole } from '@prisma/client';

export const officeService = {
  // Listar escritórios com filtros e paginação
  async findAll(query: OfficeQueryInput, userRole?: UserRole, userId?: string) {
    const { page, perPage, q, isActive, includeDeleted } = query;
    const skip = (page - 1) * perPage;

    // Construir where clause baseado nos filtros
    const where: any = {};

    // Filtro de busca
    if (q) {
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filtro de ativos/deletados
    if (userRole === UserRole.ADMIN && includeDeleted) {
      // Admin pode ver deletados se solicitar
    } else {
      where.isActive = true;
    }

    // Selecionar campos baseado no papel do usuário
    const select = userRole === UserRole.ADMIN ? fullOfficeSelect : publicOfficeSelect;

    // Buscar escritórios
    const [offices, total] = await Promise.all([
      prisma.office.findMany({
        where,
        select,
        skip,
        take: perPage,
        orderBy: { number: 'asc' },
      }),
      prisma.office.count({ where }),
    ]);

    return {
      data: offices,
      meta: {
        page,
        perPage,
        total,
      },
    };
  },

  // Buscar escritório por ID
  async findById(id: string, userRole?: UserRole, userId?: string) {
    // Selecionar campos baseado no papel do usuário
    const select = userRole === UserRole.ADMIN || 
      (userRole === UserRole.OFFICE_OWNER && userId) ? 
      { ...fullOfficeSelect, owners: { select: { userId: true } } } : 
      publicOfficeSelect;

    const office = await prisma.office.findUnique({
      where: { id },
      select,
    });

    if (!office) {
      throw new AppError('Escritório não encontrado', 404);
    }

    // Verificar se é um office owner tentando acessar outro escritório
    if (userRole === UserRole.OFFICE_OWNER && 
        !office.owners?.some(owner => owner.userId === userId)) {
      // Se for owner mas não for dono deste escritório, retorna apenas dados públicos
      return {
        id: office.id,
        number: office.number,
        companyName: office.companyName,
      };
    }

    return office;
  },

  // Criar novo escritório (ADMIN only)
  async create(data: CreateOfficeInput) {
    // Verificar se número já existe
    const existingOffice = await prisma.office.findUnique({
      where: { number: data.number },
    });

    if (existingOffice) {
      throw new AppError('Número de escritório já cadastrado', 400);
    }

    // Criar escritório e associar owner(s)
    const office = await prisma.office.create({
      data: {
        number: data.number,
        companyName: data.companyName,
        owners: data.ownerId ? {
          create: [{
            userId: data.ownerId
          }]
        } : undefined
      },
      select: {
        ...fullOfficeSelect,
        owners: {
          select: {
            userId: true
          }
        }
      },
    });

    return office;
  },

  // Atualizar escritório
  async update(id: string, data: UpdateOfficeAdminInput | UpdateOfficeOwnerInput, userRole: UserRole, userId: string) {
    // Verificar se escritório existe
    const office = await prisma.office.findUnique({
      where: { id },
      select: {
        ...fullOfficeSelect,
        owners: {
          select: {
            userId: true
          }
        }
      },
    });

    if (!office) {
      throw new AppError('Escritório não encontrado', 404);
    }

    // Verificar permissões
    if (userRole === UserRole.OFFICE_OWNER) {
      if (!office.owners?.some(owner => owner.userId === userId)) {
        throw new AppError('Você só pode editar seu próprio escritório', 403);
      }

      // Office Owner só pode atualizar companyName
      if ('ownerId' in data) {
        throw new AppError('Você não tem permissão para alterar os proprietários', 403);
      }
    }

    // Atualizar escritório
    const updatedOffice = await prisma.office.update({
      where: { id },
      data: {
        ...data,
        owners: data.ownerId ? {
          deleteMany: {},
          create: [{
            userId: data.ownerId
          }]
        } : undefined
      },
      select: {
        ...fullOfficeSelect,
        owners: {
          select: {
            userId: true
          }
        }
      },
    });

    return updatedOffice;
  },

  // Deletar escritório (soft delete)
  async delete(id: string) {
    // Verificar se escritório existe
    const office = await prisma.office.findUnique({
      where: { id },
    });

    if (!office) {
      throw new AppError('Escritório não encontrado', 404);
    }

    // Soft delete
    await prisma.office.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  },
};