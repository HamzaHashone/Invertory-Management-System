import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Types } from 'mongoose';

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Access token required'
      }
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      userId: new Types.ObjectId(payload.userId),
      tenantId: new Types.ObjectId(payload.tenantId),
      role: payload.role,
      email: payload.email
    };
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired token'
      }
    });
  }
};

export const requireRole = (roles: ('admin' | 'staff')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};
