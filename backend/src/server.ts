import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import authRoutes from './routes/auth.routes';
import lotRoutes from './routes/lot.routes';
import transactionRoutes from './routes/transaction.routes';
import dashboardRoutes from './routes/dashboard.routes';

const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://invertory-management-system-rosy.vercel.app/' || 'http://localhost:3000',
    credentials: true
  }));

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/lots', lotRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
