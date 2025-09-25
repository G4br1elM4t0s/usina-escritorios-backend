import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { RegisterUserInput, LoginUserInput } from '../schemas/userSchema';
import { AppError } from '../middleware/errorHandler';

export const createUser = async (data: RegisterUserInput) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword
    }
  });

  // Return user without password
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const loginUser = async (data: LoginUserInput) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(data.password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any }
  );

  // Return user without password and token
  const { password, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};