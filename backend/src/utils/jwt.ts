import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: 'admin' | 'staff';
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
};

export const verifyToken = (token: string): JWTPayload => {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

  if (!isJWTPayload(decoded)) {
    throw new Error('Invalid token payload');
  }

  return decoded;
};

function isJWTPayload(obj: any): obj is JWTPayload {
  return (
    typeof obj === 'object' &&
    typeof obj.userId === 'string' &&
    typeof obj.tenantId === 'string' &&
    (obj.role === 'admin' || obj.role === 'staff') &&
    typeof obj.email === 'string'
  );
}
