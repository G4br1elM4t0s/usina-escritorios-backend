import { Request, Response } from 'express';
import { registerUserSchema, loginUserSchema } from '../schemas/userSchema';
import * as userService from '../services/userService';

export const registerUser = async (req: Request, res: Response) => {
  // Validate request body
  const validatedData = registerUserSchema.parse(req.body);
  
  // Create user
  const user = await userService.createUser(validatedData);
  
  // Return response
  return res.status(201).json({
    status: 'success',
    data: { user }
  });
};

export const loginUser = async (req: Request, res: Response) => {
  // Validate request body
  const validatedData = loginUserSchema.parse(req.body);
  
  // Login user
  const { user, token } = await userService.loginUser(validatedData);
  
  // Return response
  return res.status(200).json({
    status: 'success',
    data: { user, token }
  });
};