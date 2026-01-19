import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: Types.ObjectId;
        tenantId: Types.ObjectId;
        role: 'admin' | 'staff';
        email: string;
      };
    }
  }
}

export {};
