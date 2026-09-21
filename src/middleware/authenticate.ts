import type { Request, Response, NextFunction } from 'express';
import { jwtUtil } from '../utils/jwt.js';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwtUtil.verifyAccessToken(token!);
    req.user = {
      id:       decoded.userId,
      email:    '',
      role:     decoded.role,
      tenantId: decoded.tenantId,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};