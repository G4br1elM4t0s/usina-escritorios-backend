import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { createUserSchema, updateUserSchema } from '../schemas/userSchema';

export const userController = {
  // Listar todos os usuários
  async index(req: Request, res: Response) {
    const users = await userService.findAll();
    res.json(users);
  },

  // Buscar usuário por ID
  async show(req: Request, res: Response) {
    const { id } = req.params;
    const user = await userService.findById(id);
    res.json(user);
  },

  // Criar novo usuário
  async create(req: Request, res: Response) {
    const data = createUserSchema.parse(req.body);
    const user = await userService.create(data);
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user,
    });
  },

  // Atualizar usuário
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);
    const user = await userService.update(id, validatedData as any);
    res.json({
      message: 'Usuário atualizado com sucesso',
      user,
    });
  },

  // Deletar usuário (soft delete)
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await userService.delete(id);
    res.json({
      message: 'Usuário deletado com sucesso',
    });
  },
};