import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  // Also check query parameter for video/audio streaming (browser can't send headers for media elements)
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (user: { id: string; email: string; role: string }): string => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return jwt.sign(user, secret, { expiresIn: '7d' });
};
