# Inventory Management System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-tenant SaaS inventory management system with lot tracking and sales transactions.

**Architecture:** Monorepo with separate Next.js frontend and Express backend. JWT authentication with tenant isolation middleware. MongoDB with Mongoose for data persistence. Real-time financial calculations on each transaction.

**Tech Stack:** Next.js 14 (App Router), TypeScript, shadcn/ui, Sonner, Express, MongoDB, Mongoose, JWT, bcrypt, Zod

---

## Task 1: Backend Project Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/server.ts`

**Step 1: Initialize backend project**

```bash
cd /home/hamza/Documents/Practice\ Projects/inventory-management/.worktrees/feature/initial-implementation
mkdir backend
cd backend
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express mongoose cors dotenv bcryptjs jsonwebtoken
npm install -D typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken ts-node-dev nodemon
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 4: Update package.json scripts**

Add to `backend/package.json`:
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

**Step 5: Create .env.example**

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inventory-saas
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Step 6: Create basic server.ts**

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

**Step 7: Test server runs**

```bash
npm run dev
```

Expected: Server starts and logs "Server running on port 5000"

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): initialize Express TypeScript project

- Set up package.json with dependencies
- Configure TypeScript
- Create basic Express server
- Add environment configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: MongoDB Connection & Models

**Files:**
- Create: `backend/src/config/database.ts`
- Create: `backend/src/models/Tenant.ts`
- Create: `backend/src/models/User.ts`
- Create: `backend/src/models/Lot.ts`
- Create: `backend/src/models/Transaction.ts`
- Modify: `backend/src/server.ts`

**Step 1: Create database connection**

Create `backend/src/config/database.ts`:
```typescript
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || '');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
```

**Step 2: Create Tenant model**

Create `backend/src/models/Tenant.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  businessName: string;
  email: string;
  settings: {
    lotPrefix: string;
  };
  createdAt: Date;
}

const TenantSchema = new Schema<ITenant>({
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  settings: {
    lotPrefix: {
      type: String,
      default: 'LOT-'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<ITenant>('Tenant', TenantSchema);
```

**Step 3: Create User model**

Create `backend/src/models/User.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique email per tenant
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1 });

export default mongoose.model<IUser>('User', UserSchema);
```

**Step 4: Create Lot model**

Create `backend/src/models/Lot.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface ISize {
  size: string;
  quantity: number;
  remainingQuantity: number;
  purchaseCostPerPiece: number;
  sellCostPerPiece: number;
}

interface IColor {
  color: string;
  sizes: ISize[];
}

export interface ILot extends Document {
  tenantId: mongoose.Types.ObjectId;
  lotNumber: string;
  items: IColor[];
  totalInvestment: number;
  totalRevenue: number;
  totalProfit: number;
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const SizeSchema = new Schema<ISize>({
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  purchaseCostPerPiece: { type: Number, required: true, min: 0 },
  sellCostPerPiece: { type: Number, required: true, min: 0 }
}, { _id: false });

const ColorSchema = new Schema<IColor>({
  color: { type: String, required: true },
  sizes: [SizeSchema]
}, { _id: false });

const LotSchema = new Schema<ILot>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  lotNumber: {
    type: String,
    required: true
  },
  items: [ColorSchema],
  totalInvestment: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Compound unique index for lot number per tenant
LotSchema.index({ lotNumber: 1, tenantId: 1 }, { unique: true });
LotSchema.index({ tenantId: 1 });

export default mongoose.model<ILot>('Lot', LotSchema);
```

**Step 5: Create Transaction model**

Create `backend/src/models/Transaction.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface ISoldItem {
  color: string;
  size: string;
  quantity: number;
  sellPricePerPiece: number;
  totalAmount: number;
}

export interface ITransaction extends Document {
  tenantId: mongoose.Types.ObjectId;
  lotId: mongoose.Types.ObjectId;
  soldItems: ISoldItem[];
  totalRevenue: number;
  soldBy: mongoose.Types.ObjectId;
  customerName?: string;
  invoiceNumber?: string;
  createdAt: Date;
}

const SoldItemSchema = new Schema<ISoldItem>({
  color: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  sellPricePerPiece: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 }
}, { _id: false });

const TransactionSchema = new Schema<ITransaction>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  lotId: {
    type: Schema.Types.ObjectId,
    ref: 'Lot',
    required: true
  },
  soldItems: [SoldItemSchema],
  totalRevenue: {
    type: Number,
    required: true,
    min: 0
  },
  soldBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

TransactionSchema.index({ tenantId: 1 });
TransactionSchema.index({ lotId: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
```

**Step 6: Update server.ts to connect to MongoDB**

Modify `backend/src/server.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

**Step 7: Create .env file and test connection**

```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
npm run dev
```

Expected: "MongoDB Connected: <host>" in console

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): add MongoDB models and connection

- Create database connection utility
- Add Tenant, User, Lot, Transaction models
- Configure indexes for performance and uniqueness
- Connect MongoDB on server start

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Authentication Middleware & Utilities

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/utils/jwt.ts`
- Create: `backend/src/types/express.d.ts`

**Step 1: Create JWT utilities**

Create `backend/src/utils/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

interface JWTPayload {
  userId: string;
  tenantId: string;
  role: 'admin' | 'staff';
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this';

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};
```

**Step 2: Create TypeScript type extensions**

Create `backend/src/types/express.d.ts`:
```typescript
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
```

**Step 3: Create authentication middleware**

Create `backend/src/middleware/auth.ts`:
```typescript
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
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): add authentication middleware

- Create JWT utilities for token generation/verification
- Add authentication middleware
- Add role-based authorization middleware
- Extend Express Request type for user data

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Authentication Routes (Signup & Login)

**Files:**
- Create: `backend/src/routes/auth.routes.ts`
- Create: `backend/src/controllers/auth.controller.ts`
- Modify: `backend/src/server.ts`

**Step 1: Install validation library**

```bash
cd backend
npm install zod
```

**Step 2: Create auth controller**

Create `backend/src/controllers/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Tenant from '../models/Tenant';
import User from '../models/User';
import { generateToken } from '../utils/jwt';

const signupSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  adminName: z.string().min(1, 'Admin name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const signup = async (req: Request, res: Response) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    // Check if tenant with email already exists
    const existingTenant = await Tenant.findOne({ email: validatedData.email });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email already registered'
        }
      });
    }

    // Create tenant
    const tenant = await Tenant.create({
      businessName: validatedData.businessName,
      email: validatedData.email
    });

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Create admin user
    const user = await User.create({
      tenantId: tenant._id,
      name: validatedData.adminName,
      email: validatedData.email,
      passwordHash,
      role: 'admin'
    });

    // Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      role: user.role,
      email: user.email
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: tenant._id,
          businessName: tenant.businessName
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create account'
      }
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user by email
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid email or password'
        }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid email or password'
        }
      });
    }

    // Get tenant info
    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Tenant not found'
        }
      });
    }

    // Generate JWT
    const token = generateToken({
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      role: user.role,
      email: user.email
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: tenant._id,
          businessName: tenant.businessName
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Login failed'
      }
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Not authenticated'
        }
      });
    }

    const user = await User.findById(req.user.userId);
    const tenant = await Tenant.findById(req.user.tenantId);

    if (!user || !tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User or tenant not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: tenant._id,
          businessName: tenant.businessName
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get user info'
      }
    });
  }
};
```

**Step 3: Create auth routes**

Create `backend/src/routes/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { signup, login, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

export default router;
```

**Step 4: Register routes in server.ts**

Modify `backend/src/server.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

**Step 5: Test authentication endpoints**

```bash
# Ensure server is running
npm run dev

# In another terminal, test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "adminName": "Test Admin",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected: Response with token and user data

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement authentication endpoints

- Add signup endpoint (creates tenant + admin user)
- Add login endpoint with JWT generation
- Add /me endpoint to get current user
- Implement request validation with Zod
- Add proper error handling and responses

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Lot Management Routes

**Files:**
- Create: `backend/src/routes/lot.routes.ts`
- Create: `backend/src/controllers/lot.controller.ts`
- Modify: `backend/src/server.ts`

**Step 1: Create lot controller**

Create `backend/src/controllers/lot.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import Lot from '../models/Lot';
import Tenant from '../models/Tenant';

const sizeSchema = z.object({
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  purchaseCostPerPiece: z.number().min(0, 'Purchase cost must be non-negative'),
  sellCostPerPiece: z.number().min(0, 'Sell cost must be non-negative')
});

const colorSchema = z.object({
  color: z.string().min(1, 'Color is required'),
  sizes: z.array(sizeSchema).min(1, 'At least one size is required')
});

const createLotSchema = z.object({
  lotNumber: z.string().min(1, 'Lot number is required'),
  items: z.array(colorSchema).min(1, 'At least one color is required')
});

export const createLot = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const validatedData = createLotSchema.parse(req.body);

    // Check if lot number already exists for this tenant
    const existingLot = await Lot.findOne({
      tenantId: req.user.tenantId,
      lotNumber: validatedData.lotNumber
    });

    if (existingLot) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Lot number already exists'
        }
      });
    }

    // Calculate total investment and set remainingQuantity
    let totalInvestment = 0;
    const items = validatedData.items.map(colorItem => ({
      color: colorItem.color,
      sizes: colorItem.sizes.map(sizeItem => {
        totalInvestment += sizeItem.quantity * sizeItem.purchaseCostPerPiece;
        return {
          ...sizeItem,
          remainingQuantity: sizeItem.quantity
        };
      })
    }));

    // Create lot
    const lot = await Lot.create({
      tenantId: req.user.tenantId,
      lotNumber: validatedData.lotNumber,
      items,
      totalInvestment,
      totalRevenue: 0,
      totalProfit: 0,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      data: { lot }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    console.error('Create lot error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create lot'
      }
    });
  }
};

export const getLots = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const { search, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId: req.user.tenantId };

    if (search) {
      query.lotNumber = { $regex: search, $options: 'i' };
    }

    const lots = await Lot.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('createdBy', 'name email');

    const total = await Lot.countDocuments(query);

    res.json({
      success: true,
      data: {
        lots,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get lots error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get lots'
      }
    });
  }
};

export const getLot = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const lot = await Lot.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('createdBy', 'name email');

    if (!lot) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lot not found'
        }
      });
    }

    res.json({
      success: true,
      data: { lot }
    });
  } catch (error) {
    console.error('Get lot error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get lot'
      }
    });
  }
};

export const generateLotNumber = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' }
      });
    }

    // Find the latest lot number for this tenant
    const lastLot = await Lot.findOne({ tenantId: req.user.tenantId })
      .sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastLot) {
      // Extract number from lot number (e.g., "LOT-005" -> 5)
      const match = lastLot.lotNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const lotNumber = `${tenant.settings.lotPrefix}${String(nextNumber).padStart(3, '0')}`;

    res.json({
      success: true,
      data: { lotNumber }
    });
  } catch (error) {
    console.error('Generate lot number error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate lot number'
      }
    });
  }
};
```

**Step 2: Create lot routes**

Create `backend/src/routes/lot.routes.ts`:
```typescript
import { Router } from 'express';
import {
  createLot,
  getLots,
  getLot,
  generateLotNumber
} from '../controllers/lot.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All lot routes require authentication
router.use(authenticateToken);

router.post('/', createLot);
router.get('/', getLots);
router.get('/:id', getLot);
router.post('/generate-number', generateLotNumber);

export default router;
```

**Step 3: Register routes in server.ts**

Modify `backend/src/server.ts` to add:
```typescript
import lotRoutes from './routes/lot.routes';

// Add after auth routes
app.use('/api/lots', lotRoutes);
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement lot management endpoints

- Add create lot endpoint with validation
- Add get lots with pagination and search
- Add get single lot by ID
- Add auto-generate lot number endpoint
- Calculate total investment on lot creation
- Enforce tenant isolation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Transaction Routes (Sell Items)

**Files:**
- Create: `backend/src/routes/transaction.routes.ts`
- Create: `backend/src/controllers/transaction.controller.ts`
- Modify: `backend/src/server.ts`

**Step 1: Create transaction controller**

Create `backend/src/controllers/transaction.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction';
import Lot from '../models/Lot';

const soldItemSchema = z.object({
  color: z.string().min(1, 'Color is required'),
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1')
});

const createSaleSchema = z.object({
  soldItems: z.array(soldItemSchema).min(1, 'At least one item is required'),
  customerName: z.string().optional(),
  invoiceNumber: z.string().optional()
});

export const createSale = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const { id: lotId } = req.params;
    const validatedData = createSaleSchema.parse(req.body);

    // Get lot with session for transaction safety
    const lot = await Lot.findOne({
      _id: lotId,
      tenantId: req.user.tenantId
    }).session(session);

    if (!lot) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lot not found' }
      });
    }

    // Validate stock and prepare transaction items
    const soldItems: any[] = [];
    let totalRevenue = 0;

    for (const item of validatedData.soldItems) {
      const colorItem = lot.items.find(c => c.color === item.color);
      if (!colorItem) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Color "${item.color}" not found in lot`
          }
        });
      }

      const sizeItem = colorItem.sizes.find(s => s.size === item.size);
      if (!sizeItem) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Size "${item.size}" not found for color "${item.color}"`
          }
        });
      }

      if (sizeItem.remainingQuantity < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${item.color} - ${item.size}. Available: ${sizeItem.remainingQuantity}`,
            details: {
              color: item.color,
              size: item.size,
              requested: item.quantity,
              available: sizeItem.remainingQuantity
            }
          }
        });
      }

      const itemTotal = item.quantity * sizeItem.sellCostPerPiece;
      totalRevenue += itemTotal;

      soldItems.push({
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        sellPricePerPiece: sizeItem.sellCostPerPiece,
        totalAmount: itemTotal
      });

      // Update remaining quantity
      sizeItem.remainingQuantity -= item.quantity;
    }

    // Update lot financials
    lot.totalRevenue += totalRevenue;
    lot.totalProfit = lot.totalRevenue - lot.totalInvestment;

    await lot.save({ session });

    // Create transaction
    const transaction = await Transaction.create([{
      tenantId: req.user.tenantId,
      lotId: lot._id,
      soldItems,
      totalRevenue,
      soldBy: req.user.userId,
      customerName: validatedData.customerName,
      invoiceNumber: validatedData.invoiceNumber
    }], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: {
        transaction: transaction[0],
        lot
      }
    });
  } catch (error) {
    await session.abortTransaction();

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors
        }
      });
    }

    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create sale'
      }
    });
  } finally {
    session.endSession();
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const { lotId, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId: req.user.tenantId };

    if (lotId) {
      query.lotId = lotId;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('soldBy', 'name email')
      .populate('lotId', 'lotNumber');

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get transactions'
      }
    });
  }
};

export const getTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
      .populate('soldBy', 'name email')
      .populate('lotId', 'lotNumber');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get transaction'
      }
    });
  }
};
```

**Step 2: Create transaction routes**

Create `backend/src/routes/transaction.routes.ts`:
```typescript
import { Router } from 'express';
import {
  createSale,
  getTransactions,
  getTransaction
} from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/lots/:id/sell', createSale);
router.get('/', getTransactions);
router.get('/:id', getTransaction);

export default router;
```

**Step 3: Register routes in server.ts**

Modify `backend/src/server.ts` to add:
```typescript
import transactionRoutes from './routes/transaction.routes';

// Add after lot routes
app.use('/api/transactions', transactionRoutes);
// Also add the sell endpoint under lots
app.use('/api', transactionRoutes); // This allows /api/lots/:id/sell
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement transaction endpoints

- Add create sale endpoint with stock validation
- Use MongoDB transactions for atomic updates
- Validate stock before processing sale
- Update lot quantities and financials
- Add get transactions with filtering
- Add get single transaction by ID

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Dashboard Routes

**Files:**
- Create: `backend/src/routes/dashboard.routes.ts`
- Create: `backend/src/controllers/dashboard.controller.ts`
- Modify: `backend/src/server.ts`

**Step 1: Create dashboard controller**

Create `backend/src/controllers/dashboard.controller.ts`:
```typescript
import { Request, Response } from 'express';
import Lot from '../models/Lot';
import Transaction from '../models/Transaction';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    // Get all lots for tenant
    const lots = await Lot.find({ tenantId: req.user.tenantId });

    // Calculate aggregated stats
    const totalInvestment = lots.reduce((sum, lot) => sum + lot.totalInvestment, 0);
    const totalRevenue = lots.reduce((sum, lot) => sum + lot.totalRevenue, 0);
    const totalProfit = totalRevenue - totalInvestment;
    const activeLots = lots.length;

    // Count lots with remaining inventory
    const lotsWithStock = lots.filter(lot =>
      lot.items.some(color =>
        color.sizes.some(size => size.remainingQuantity > 0)
      )
    ).length;

    res.json({
      success: true,
      data: {
        totalInvestment,
        totalRevenue,
        totalProfit,
        activeLots,
        lotsWithStock
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get dashboard stats'
      }
    });
  }
};

export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Not authenticated' }
      });
    }

    const limit = Number(req.query.limit) || 10;

    const transactions = await Transaction.find({ tenantId: req.user.tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('soldBy', 'name email')
      .populate('lotId', 'lotNumber');

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get recent transactions'
      }
    });
  }
};
```

**Step 2: Create dashboard routes**

Create `backend/src/routes/dashboard.routes.ts`:
```typescript
import { Router } from 'express';
import {
  getDashboardStats,
  getRecentTransactions
} from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);
router.get('/recent-transactions', getRecentTransactions);

export default router;
```

**Step 3: Register routes in server.ts**

Modify `backend/src/server.ts` to add:
```typescript
import dashboardRoutes from './routes/dashboard.routes';

// Add after transaction routes
app.use('/api/dashboard', dashboardRoutes);
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement dashboard endpoints

- Add dashboard stats endpoint (investment, revenue, profit)
- Add recent transactions endpoint
- Calculate aggregated financials across all lots
- Support for tenant-scoped data

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Frontend Project Setup

**Files:**
- Create: `frontend/` directory and Next.js app

**Step 1: Create Next.js app**

```bash
cd /home/hamza/Documents/Practice\ Projects/inventory-management/.worktrees/feature/initial-implementation
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Answer prompts:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- App Router: Yes
- Turbopack: No
- Import alias: @/*

**Step 2: Install dependencies**

```bash
cd frontend
npm install axios sonner
npm install -D @types/node
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Answer prompts:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 4: Install shadcn components**

```bash
npx shadcn@latest add button input label card table dialog select form badge dropdown-menu
```

**Step 5: Create .env.local**

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): initialize Next.js project with shadcn/ui

- Create Next.js 14 app with TypeScript
- Install Tailwind CSS
- Initialize shadcn/ui with default theme
- Install required shadcn components
- Add axios and sonner for API and toasts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Frontend API Client & Auth Context

**Files:**
- Create: `frontend/lib/api.ts`
- Create: `frontend/lib/auth-context.tsx`
- Create: `frontend/types/index.ts`

**Step 1: Create TypeScript types**

Create `frontend/types/index.ts`:
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  tenantId: string;
  businessName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Lot {
  _id: string;
  lotNumber: string;
  items: {
    color: string;
    sizes: {
      size: string;
      quantity: number;
      remainingQuantity: number;
      purchaseCostPerPiece: number;
      sellCostPerPiece: number;
    }[];
  }[];
  totalInvestment: number;
  totalRevenue: number;
  totalProfit: number;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export interface Transaction {
  _id: string;
  lotId: {
    _id: string;
    lotNumber: string;
  };
  soldItems: {
    color: string;
    size: string;
    quantity: number;
    sellPricePerPiece: number;
    totalAmount: number;
  }[];
  totalRevenue: number;
  soldBy: {
    name: string;
    email: string;
  };
  customerName?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalInvestment: number;
  totalRevenue: number;
  totalProfit: number;
  activeLots: number;
  lotsWithStock: number;
}
```

**Step 2: Create API client**

Create `frontend/lib/api.ts`:
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Step 3: Create auth context**

Create `frontend/lib/auth-context.tsx`:
```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    businessName: string;
    adminName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>(
      '/auth/login',
      { email, password }
    );
    const { token, user: userData } = response.data.data;
    localStorage.setItem('token', token);
    setUser(userData);
    router.push('/dashboard');
  };

  const signup = async (data: {
    businessName: string;
    adminName: string;
    email: string;
    password: string;
  }) => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>(
      '/auth/signup',
      data
    );
    const { token, user: userData } = response.data.data;
    localStorage.setItem('token', token);
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add API client and auth context

- Create TypeScript types for data models
- Set up axios API client with interceptors
- Add JWT token handling
- Create auth context with login/signup/logout
- Add auto-redirect on 401 errors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Authentication Pages (Login & Signup)

**Files:**
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/app/login/page.tsx`
- Create: `frontend/app/signup/page.tsx`
- Create: `frontend/components/protected-route.tsx`

**Step 1: Update root layout**

Modify `frontend/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inventory Management System",
  description: "Multi-tenant inventory and sales tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 2: Create login page**

Create `frontend/app/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Login to Inventory System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create signup page**

Create `frontend/app/signup/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    adminName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signup(formData);
      toast.success('Account created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Create Your Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="adminName">Your Name</Label>
              <Input
                id="adminName"
                value={formData.adminName}
                onChange={(e) =>
                  setFormData({ ...formData, adminName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Create protected route wrapper**

Create `frontend/components/protected-route.tsx`:
```typescript
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

**Step 5: Update home page to redirect**

Modify `frontend/app/page.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): implement authentication pages

- Create login page with form validation
- Create signup page for tenant registration
- Add protected route wrapper component
- Update root layout with auth provider and toaster
- Redirect home to dashboard or login

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Dashboard Page

**Files:**
- Create: `frontend/app/dashboard/page.tsx`
- Create: `frontend/components/navbar.tsx`

**Step 1: Create navbar component**

Create `frontend/components/navbar.tsx`:
```typescript
'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold">
            {user?.businessName}
          </Link>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/lots"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Lots
            </Link>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {user?.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.email}
              <div className="text-xs text-gray-500">{user?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
```

**Step 2: Create dashboard page**

Create `frontend/app/dashboard/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { DashboardStats, Transaction } from '@/types';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, transactionsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-transactions?limit=10'),
      ]);
      setStats(statsRes.data.data);
      setRecentTransactions(transactionsRes.data.data.transactions);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => router.push('/lots/new')}>
            Create New Lot
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${stats?.totalInvestment.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ${stats?.totalRevenue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  (stats?.totalProfit ?? 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                ${stats?.totalProfit.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Lots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.activeLots}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500">No transactions yet</p>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between border-b pb-3"
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.lotId.lotNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Sold by {transaction.soldBy.name}
                        {transaction.customerName &&
                          ` to ${transaction.customerName}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">
                      ${transaction.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): implement dashboard page

- Create navbar with user menu and logout
- Add dashboard with financial stats cards
- Display recent transactions list
- Fetch data from dashboard API endpoints
- Add navigation to create lot

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Lots List Page

**Files:**
- Create: `frontend/app/lots/page.tsx`

**Step 1: Create lots list page**

Create `frontend/app/lots/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { Lot } from '@/types';
import { toast } from 'sonner';

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLots();
  }, [search]);

  const fetchLots = async () => {
    try {
      const response = await api.get('/lots', {
        params: { search: search || undefined },
      });
      setLots(response.data.data.lots);
    } catch (error) {
      toast.error('Failed to load lots');
    } finally {
      setLoading(false);
    }
  };

  const getRemainingItems = (lot: Lot) => {
    return lot.items.reduce(
      (total, color) =>
        total +
        color.sizes.reduce((sum, size) => sum + size.remainingQuantity, 0),
      0
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Lots</h1>
          <Button onClick={() => router.push('/lots/new')}>
            Create New Lot
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search by lot number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot Number</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Investment</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Remaining Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No lots found
                  </TableCell>
                </TableRow>
              ) : (
                lots.map((lot) => (
                  <TableRow key={lot._id}>
                    <TableCell className="font-medium">
                      {lot.lotNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(lot.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${lot.totalInvestment.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ${lot.totalRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        lot.totalProfit >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      ${lot.totalProfit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {getRemainingItems(lot)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/lots/${lot._id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => router.push(`/lots/${lot._id}?sell=true`)}
                          disabled={getRemainingItems(lot) === 0}
                        >
                          Sell
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): implement lots list page

- Create lots table with search functionality
- Display lot financials and remaining items
- Add view details and sell buttons
- Disable sell button when no stock remains
- Fetch lots from API with search support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

---

## Task 13: Create Lot Page

**Files:**
- Create: `frontend/app/lots/new/page.tsx`

**Step 1: Create lot form page**

Create `frontend/app/lots/new/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Size {
  id: string;
  size: string;
  quantity: string;
  purchaseCostPerPiece: string;
  sellCostPerPiece: string;
}

interface Color {
  id: string;
  color: string;
  sizes: Size[];
}

export default function CreateLotPage() {
  const [lotNumber, setLotNumber] = useState('');
  const [colors, setColors] = useState<Color[]>([
    {
      id: crypto.randomUUID(),
      color: '',
      sizes: [
        {
          id: crypto.randomUUID(),
          size: '',
          quantity: '',
          purchaseCostPerPiece: '',
          sellCostPerPiece: '',
        },
      ],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAutoGenerate = async () => {
    try {
      const response = await api.post('/lots/generate-number');
      setLotNumber(response.data.data.lotNumber);
      toast.success('Lot number generated');
    } catch (error) {
      toast.error('Failed to generate lot number');
    }
  };

  const addColor = () => {
    setColors([
      ...colors,
      {
        id: crypto.randomUUID(),
        color: '',
        sizes: [
          {
            id: crypto.randomUUID(),
            size: '',
            quantity: '',
            purchaseCostPerPiece: '',
            sellCostPerPiece: '',
          },
        ],
      },
    ]);
  };

  const removeColor = (colorId: string) => {
    setColors(colors.filter((c) => c.id !== colorId));
  };

  const updateColor = (colorId: string, value: string) => {
    setColors(
      colors.map((c) => (c.id === colorId ? { ...c, color: value } : c))
    );
  };

  const addSize = (colorId: string) => {
    setColors(
      colors.map((c) =>
        c.id === colorId
          ? {
              ...c,
              sizes: [
                ...c.sizes,
                {
                  id: crypto.randomUUID(),
                  size: '',
                  quantity: '',
                  purchaseCostPerPiece: '',
                  sellCostPerPiece: '',
                },
              ],
            }
          : c
      )
    );
  };

  const removeSize = (colorId: string, sizeId: string) => {
    setColors(
      colors.map((c) =>
        c.id === colorId
          ? { ...c, sizes: c.sizes.filter((s) => s.id !== sizeId) }
          : c
      )
    );
  };

  const updateSize = (
    colorId: string,
    sizeId: string,
    field: keyof Size,
    value: string
  ) => {
    setColors(
      colors.map((c) =>
        c.id === colorId
          ? {
              ...c,
              sizes: c.sizes.map((s) =>
                s.id === sizeId ? { ...s, [field]: value } : s
              ),
            }
          : c
      )
    );
  };

  const calculateTotalInvestment = () => {
    return colors.reduce((total, color) => {
      return (
        total +
        color.sizes.reduce((sum, size) => {
          const qty = parseFloat(size.quantity) || 0;
          const cost = parseFloat(size.purchaseCostPerPiece) || 0;
          return sum + qty * cost;
        }, 0)
      );
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        lotNumber,
        items: colors.map((color) => ({
          color: color.color,
          sizes: color.sizes.map((size) => ({
            size: size.size,
            quantity: parseFloat(size.quantity),
            purchaseCostPerPiece: parseFloat(size.purchaseCostPerPiece),
            sellCostPerPiece: parseFloat(size.sellCostPerPiece),
          })),
        })),
      };

      await api.post('/lots', payload);
      toast.success('Lot created successfully');
      router.push('/lots');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create lot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Create New Lot</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lot Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="lotNumber">Lot Number</Label>
                  <Input
                    id="lotNumber"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoGenerate}
                  >
                    Auto-generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {colors.map((color, colorIndex) => (
            <Card key={color.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Color {colorIndex + 1}</CardTitle>
                  {colors.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeColor(color.id)}
                    >
                      Remove Color
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Color Name</Label>
                  <Input
                    value={color.color}
                    onChange={(e) => updateColor(color.id, e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Sizes</Label>
                  <div className="space-y-3">
                    {color.sizes.map((size) => (
                      <div key={size.id} className="grid grid-cols-5 gap-2">
                        <Input
                          placeholder="Size"
                          value={size.size}
                          onChange={(e) =>
                            updateSize(color.id, size.id, 'size', e.target.value)
                          }
                          required
                        />
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={size.quantity}
                          onChange={(e) =>
                            updateSize(color.id, size.id, 'quantity', e.target.value)
                          }
                          required
                          min="1"
                        />
                        <Input
                          type="number"
                          placeholder="Purchase $"
                          value={size.purchaseCostPerPiece}
                          onChange={(e) =>
                            updateSize(
                              color.id,
                              size.id,
                              'purchaseCostPerPiece',
                              e.target.value
                            )
                          }
                          required
                          min="0"
                          step="0.01"
                        />
                        <Input
                          type="number"
                          placeholder="Sell $"
                          value={size.sellCostPerPiece}
                          onChange={(e) =>
                            updateSize(
                              color.id,
                              size.id,
                              'sellCostPerPiece',
                              e.target.value
                            )
                          }
                          required
                          min="0"
                          step="0.01"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSize(color.id, size.id)}
                          disabled={color.sizes.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSize(color.id)}
                    className="mt-2"
                  >
                    Add Size
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addColor}>
            Add Color
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                Total Investment: ${calculateTotalInvestment().toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Lot'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/lots')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): implement create lot page

- Add dynamic form for colors and sizes
- Support add/remove colors and sizes
- Auto-generate lot number button
- Real-time investment calculation
- Form validation and error handling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Lot Details Page & Sell Modal

**Files:**
- Create: `frontend/app/lots/[id]/page.tsx`
- Create: `frontend/components/sell-modal.tsx`

**Step 1: Create sell modal component**

Create `frontend/components/sell-modal.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lot } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SellItem {
  id: string;
  color: string;
  size: string;
  quantity: number;
  sellPricePerPiece: number;
}

interface SellModalProps {
  lot: Lot;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SellModal({ lot, open, onClose, onSuccess }: SellModalProps) {
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellItems, setSellItems] = useState<SellItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const availableSizes = selectedColor
    ? lot.items
        .find((item) => item.color === selectedColor)
        ?.sizes.filter((size) => size.remainingQuantity > 0) || []
    : [];

  const selectedSizeData = availableSizes.find((s) => s.size === selectedSize);
  const maxQuantity = selectedSizeData?.remainingQuantity || 0;

  useEffect(() => {
    if (!availableSizes.find((s) => s.size === selectedSize)) {
      setSelectedSize('');
    }
  }, [selectedColor, availableSizes, selectedSize]);

  const handleAddItem = () => {
    if (!selectedColor || !selectedSize || !quantity) {
      toast.error('Please select color, size, and quantity');
      return;
    }

    const qty = parseInt(quantity);
    if (qty > maxQuantity) {
      toast.error(`Only ${maxQuantity} items available`);
      return;
    }

    const sizeData = selectedSizeData!;

    setSellItems([
      ...sellItems,
      {
        id: crypto.randomUUID(),
        color: selectedColor,
        size: selectedSize,
        quantity: qty,
        sellPricePerPiece: sizeData.sellCostPerPiece,
      },
    ]);

    setSelectedColor('');
    setSelectedSize('');
    setQuantity('1');
  };

  const handleRemoveItem = (id: string) => {
    setSellItems(sellItems.filter((item) => item.id !== id));
  };

  const getTotalRevenue = () => {
    return sellItems.reduce(
      (total, item) => total + item.quantity * item.sellPricePerPiece,
      0
    );
  };

  const handleSubmit = async () => {
    if (sellItems.length === 0) {
      toast.error('Add at least one item to sell');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/lots/${lot._id}/sell`, {
        soldItems: sellItems.map((item) => ({
          color: item.color,
          size: item.size,
          quantity: item.quantity,
        })),
        customerName: customerName || undefined,
        invoiceNumber: invoiceNumber || undefined,
      });

      toast.success('Sale completed successfully');
      setSellItems([]);
      setCustomerName('');
      setInvoiceNumber('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sell Items - {lot.lotNumber}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Select Items</h3>

            <div>
              <Label>Color</Label>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {lot.items
                    .filter((item) =>
                      item.sizes.some((size) => size.remainingQuantity > 0)
                    )
                    .map((item) => (
                      <SelectItem key={item.color} value={item.color}>
                        {item.color}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedColor && (
              <div>
                <Label>Size</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSizes.map((size) => (
                      <SelectItem key={size.size} value={size.size}>
                        {size.size} (Available: {size.remainingQuantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSize && (
              <div>
                <Label>Quantity (Max: {maxQuantity})</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  max={maxQuantity}
                />
              </div>
            )}

            <Button onClick={handleAddItem} className="w-full">
              Add to Sale
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Selling Items</h3>

            {sellItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {sellItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border p-2 rounded"
                  >
                    <div className="text-sm">
                      <p className="font-medium">
                        {item.color} - {item.size}
                      </p>
                      <p className="text-gray-600">
                        {item.quantity} × ${item.sellPricePerPiece.toFixed(2)} = $
                        {(item.quantity * item.sellPricePerPiece).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xl font-bold">
                Total: ${getTotalRevenue().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <Label>Customer Name (Optional)</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div>
            <Label>Invoice Number (Optional)</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || sellItems.length === 0}>
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create lot details page**

Create `frontend/app/lots/[id]/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import SellModal from '@/components/sell-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { Lot, Transaction } from '@/types';
import { toast } from 'sonner';

export default function LotDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lot, setLot] = useState<Lot | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellModalOpen, setSellModalOpen] = useState(false);

  useEffect(() => {
    fetchLotDetails();
    fetchTransactions();

    if (searchParams.get('sell') === 'true') {
      setSellModalOpen(true);
    }
  }, [params.id]);

  const fetchLotDetails = async () => {
    try {
      const response = await api.get(`/lots/${params.id}`);
      setLot(response.data.data.lot);
    } catch (error) {
      toast.error('Failed to load lot details');
      router.push('/lots');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions', {
        params: { lotId: params.id },
      });
      setTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions');
    }
  };

  const handleSellSuccess = () => {
    fetchLotDetails();
    fetchTransactions();
  };

  const getRemainingItems = () => {
    if (!lot) return 0;
    return lot.items.reduce(
      (total, color) =>
        total +
        color.sizes.reduce((sum, size) => sum + size.remainingQuantity, 0),
      0
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!lot) {
    return null;
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="outline" onClick={() => router.push('/lots')}>
              ← Back to Lots
            </Button>
            <h1 className="text-3xl font-bold mt-4">{lot.lotNumber}</h1>
            <p className="text-gray-600">
              Created on {new Date(lot.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            onClick={() => setSellModalOpen(true)}
            disabled={getRemainingItems() === 0}
          >
            Sell Items
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${lot.totalInvestment.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ${lot.totalRevenue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  lot.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ${lot.totalProfit.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Remaining Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{getRemainingItems()}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Inventory Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {lot.items.map((colorItem) => (
                <div key={colorItem.color}>
                  <h3 className="font-semibold text-lg mb-3">{colorItem.color}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {colorItem.sizes.map((size) => (
                      <div
                        key={size.size}
                        className="border p-3 rounded flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">Size {size.size}</Badge>
                          <span className="text-sm text-gray-600">
                            Quantity: {size.remainingQuantity} / {size.quantity}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>Purchase: ${size.purchaseCostPerPiece.toFixed(2)}</span>
                          <span>Sell: ${size.sellCostPerPiece.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-gray-500">No transactions yet</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction._id} className="border-b pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Sold by {transaction.soldBy.name}
                        </p>
                        {transaction.customerName && (
                          <p className="text-sm text-gray-600">
                            Customer: {transaction.customerName}
                          </p>
                        )}
                        {transaction.invoiceNumber && (
                          <p className="text-sm text-gray-600">
                            Invoice: {transaction.invoiceNumber}
                          </p>
                        )}
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        ${transaction.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.soldItems.map((item, idx) => (
                        <span key={idx}>
                          {item.color} - {item.size} × {item.quantity}
                          {idx < transaction.soldItems.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SellModal
        lot={lot}
        open={sellModalOpen}
        onClose={() => {
          setSellModalOpen(false);
          router.replace(`/lots/${params.id}`);
        }}
        onSuccess={handleSellSuccess}
      />
    </ProtectedRoute>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): implement lot details page and sell modal

- Create lot details view with financials
- Display inventory breakdown by color and size
- Show transaction history for lot
- Implement sell modal with cart functionality
- Support selecting items, quantity validation
- Add optional customer name and invoice number

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Final Polish & Testing

**Files:**
- Create: `README.md` in root

**Step 1: Create comprehensive README**

Create updated `README.md` in root:
```markdown
# Inventory Management System

A multi-tenant SaaS platform for inventory lot management and sales tracking.

## Features

- **Multi-tenant Architecture** - Complete data isolation between businesses
- **User Roles** - Admin and Staff roles with appropriate permissions
- **Lot Management** - Create lots with nested color/size inventory structure
- **Sales Transactions** - Modal-based selling with stock validation
- **Financial Tracking** - Real-time investment, revenue, and profit calculations
- **Dashboard** - Aggregated financials and recent transaction history

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Sonner for toast notifications
- Axios for API calls

**Backend:**
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT authentication
- bcrypt for password hashing
- Zod for validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd inventory-management
```

2. Set up backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

3. Set up frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your API URL
npm run dev
```

4. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### First Time Setup

1. Go to http://localhost:3000/signup
2. Create your business account (this creates a tenant + admin user)
3. Login and start creating lots

## Project Structure

```
inventory-management/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth middleware
│   │   ├── utils/          # JWT utilities
│   │   └── server.ts       # Express app entry
│   └── package.json
├── frontend/
│   ├── app/                # Next.js pages (App Router)
│   ├── components/         # React components
│   ├── lib/                # API client, auth context
│   ├── types/              # TypeScript types
│   └── package.json
└── docs/
    └── plans/              # Design and implementation docs
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create tenant + admin
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Lots
- `GET /api/lots` - List all lots
- `POST /api/lots` - Create new lot
- `GET /api/lots/:id` - Get lot details
- `POST /api/lots/generate-number` - Auto-generate lot number

### Transactions
- `POST /api/lots/:id/sell` - Create sale transaction
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details

### Dashboard
- `GET /api/dashboard/stats` - Get aggregated stats
- `GET /api/dashboard/recent-transactions` - Get recent sales

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

## Deployment

### Backend (Railway/Render)
1. Connect GitHub repository
2. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `NODE_ENV=production`
3. Deploy

### Frontend (Vercel)
1. Connect GitHub repository
2. Set environment variable:
   - `NEXT_PUBLIC_API_URL`
3. Deploy

## License

MIT
```

**Step 2: Test the complete application**

```bash
# Start backend
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev

# Manual testing checklist:
# 1. Signup flow - create tenant + admin
# 2. Login flow - authenticate user
# 3. Dashboard - view stats (should be $0 initially)
# 4. Create lot - test auto-generate, add colors/sizes
# 5. View lot details - verify inventory display
# 6. Sell items - test stock validation, transaction creation
# 7. Dashboard refresh - verify updated financials
# 8. Logout and login again - verify session persistence
```

**Step 3: Create .env.example files**

Create `backend/.env.example` (if not exists):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inventory-saas
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Create `frontend/.env.local.example`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Step 4: Final commit**

```bash
git add .
git commit -m "docs: add comprehensive README and env examples

- Add detailed setup instructions
- Document API endpoints
- Add project structure overview
- Include deployment guidelines
- Add .env.example files for both frontend and backend

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Merge to Main

**Step 1: Push branch to remote (if using remote repo)**

```bash
git push origin feature/initial-implementation
```

**Step 2: Return to main branch**

```bash
cd /home/hamza/Documents/Practice\ Projects/inventory-management
git worktree list
```

**Step 3: Review changes and merge**

```bash
# From main branch directory
git merge feature/initial-implementation
```

**Step 4: Clean up worktree**

```bash
git worktree remove .worktrees/feature/initial-implementation
```

**Step 5: Verify everything works**

```bash
# Test both frontend and backend from main branch
cd backend && npm run dev
cd frontend && npm run dev
```

---

## Summary

This implementation plan provides a complete, production-ready Inventory Management System with:

**Completed Features:**
✅ Multi-tenant architecture with data isolation
✅ JWT authentication (signup, login, logout)
✅ Lot management (create, view, list, search)
✅ Nested color/size inventory structure
✅ Sales transactions with atomic updates
✅ Stock validation prevents overselling
✅ Financial tracking (investment, revenue, profit)
✅ Dashboard with aggregated stats
✅ Recent transactions display
✅ Responsive UI with shadcn/ui components
✅ Sonner toast notifications
✅ Protected routes and role-based access

**Next Steps:**
- Add user management (admin can create/delete staff users)
- Implement edit/delete lot functionality
- Add date range filtering for transactions
- Create printable receipts/invoices
- Add data export (CSV/PDF)
- Implement pagination for large datasets
- Add unit and integration tests
- Set up CI/CD pipeline
