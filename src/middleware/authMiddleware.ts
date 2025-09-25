import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new AppError('Authentication required', 401);
  }
  
  // Accept both 'Bearer token' format and direct token
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : authHeader;
  
  if (!token) {
    throw new AppError('Token não fornecido', 401);
  }
  
  try {
    console.log('Auth header:', authHeader);
    console.log('Token before trim:', token);
    console.log('Token after trim:', token.trim());
    
    // Verify token
    const decoded = jwt.verify(
      token.trim(),
      (process.env.JWT_SECRET || 'fallback-secret-key') as Secret
    ) as { userId: string; role: string };
    
    console.log('Decoded token:', decoded);
    
    // Add user to request
    req.user = {
      id: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (error) {
    console.log('Token error:', error);
    console.log('Token received:', token);
    throw new AppError(`Token inválido: ${error.message}`, 401);
  }
};