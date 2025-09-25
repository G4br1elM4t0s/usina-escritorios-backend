import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { CreateUserInput } from '../schemas/userSchema';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export const userService = {
  // Listar todos os usuários
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  // Buscar usuário por ID
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    return user;
  },

  // Criar novo usuário
  async create(data: CreateUserInput) {
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email já cadastrado', 400);
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  // Atualizar usuário
  async update(id: string, data: Prisma.UserUpdateInput) {
    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Verificar se email já existe (se estiver sendo atualizado)
    const emailToUpdate = typeof data.email === 'string' ? data.email : data.email?.set;
    if (emailToUpdate && emailToUpdate !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: emailToUpdate },
      });

      if (emailExists) {
        throw new AppError('Email já cadastrado', 400);
      }
    }

    // Atualizar usuário
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  // Deletar usuário (soft delete)
  async delete(id: string) {
    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  },
};