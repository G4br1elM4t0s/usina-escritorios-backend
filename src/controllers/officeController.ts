import { Request, Response } from 'express';
import { officeService } from '../services/officeService';
import { createOfficeSchema, updateOfficeAdminSchema, updateOfficeOwnerSchema, officeQuerySchema } from '../schemas/officeSchema';
import { UserRole } from '@prisma/client';

export const officeController = {
  // Listar escritórios
  async index(req: Request, res: Response) {
    const query = await officeQuerySchema.parseAsync(req.query);
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const result = await officeService.findAll(query, userRole, userId);

    return res.json({
      success: true,
      ...result,
    });
  },

  // Buscar escritório por ID
  async show(req: Request, res: Response) {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const office = await officeService.findById(id, userRole, userId);

    return res.json({
      success: true,
      data: office,
    });
  },

  // Criar escritório
  async create(req: Request, res: Response) {
    const data = await createOfficeSchema.parseAsync(req.body);

    const office = await officeService.create(data);

    return res.status(201).json({
      success: true,
      data: office,
    });
  },

  // Atualizar escritório
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Validar dados baseado no papel do usuário
    const data = userRole === UserRole.ADMIN
      ? await updateOfficeAdminSchema.parseAsync(req.body)
      : await updateOfficeOwnerSchema.parseAsync(req.body);

    const office = await officeService.update(id, data, userRole!, userId!);

    return res.json({
      success: true,
      data: office,
    });
  },

  // Deletar escritório
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    await officeService.delete(id);

    return res.json({
      success: true,
      data: null,
    });
  },
};