import { Request, Response } from 'express';
import Lot from '../models/Lot';
import Transaction from '../models/Transaction';

export const getDashboardStats = async (req: Request, res: Response) => {
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

    // Get all lots for tenant
    const lots = await Lot.find({ tenantId: req.user.tenantId });

    // Calculate aggregated stats
    const totalInvestment = lots.reduce((sum, lot) => sum + lot.totalInvestment, 0);
    const totalRevenue = lots.reduce((sum, lot) => sum + lot.totalRevenue, 0);
    // Profit should only reflect margin on SOLD items, not total investment
    // Each lot tracks its own profit from sales: (sell price - cost price) per sold item
    const totalProfit = lots.reduce((sum, lot) => sum + lot.totalProfit, 0);
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
        message: 'Failed to fetch dashboard stats'
      }
    });
  }
};

export const getRecentTransactions = async (req: Request, res: Response) => {
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

    const limit = parseInt(req.query.limit as string) || 10;

    const transactions = await Transaction.find({
      tenantId: req.user.tenantId
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('lotId', 'lotNumber')
      .populate('soldBy', 'name email');

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
        message: 'Failed to fetch recent transactions'
      }
    });
  }
};

export const getChartData = async (req: Request, res: Response) => {
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

    // Get transactions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await Transaction.find({
      tenantId: req.user.tenantId,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    // Get all lots
    const lots = await Lot.find({ tenantId: req.user.tenantId });

    // Revenue trend over time (daily)
    const revenueByDate: { [key: string]: { revenue: number; transactions: number } } = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt).toISOString().split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = { revenue: 0, transactions: 0 };
      }
      revenueByDate[date].revenue += transaction.totalRevenue;
      revenueByDate[date].transactions += 1;
    });

    // Calculate profit by date from lots

    const profitByDate: { [key: string]: number } = {};
    lots.forEach(lot => {
      const date = new Date(lot.createdAt).toISOString().split('T')[0];
      if (lot.totalRevenue > 0) {
        profitByDate[date] = (profitByDate[date] || 0) + lot.totalProfit;
      }
    });

    const revenueTrend = Object.entries(revenueByDate)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        profit: profitByDate[date] || 0,
        transactions: data.transactions
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sales by lot
    const salesByLot = lots.map(lot => ({
      lotNumber: lot.lotNumber,
      revenue: lot.totalRevenue,
      profit: lot.totalProfit,
      investment: lot.totalInvestment
    })).filter(lot => lot.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Inventory status by lot
    const inventoryStatus = lots.map(lot => {
      const totalItems = lot.items.reduce((total, color) =>
        total + color.sizes.reduce((sum, size) => sum + size.quantity, 0), 0
      );
      const remainingItems = lot.items.reduce((total, color) =>
        total + color.sizes.reduce((sum, size) => sum + size.remainingQuantity, 0), 0
      );
      const soldItems = totalItems - remainingItems;

      return {
        lotNumber: lot.lotNumber,
        total: totalItems,
        sold: soldItems,
        remaining: remainingItems,
        soldPercentage: totalItems > 0 ? (soldItems / totalItems) * 100 : 0
      };
    }).filter(lot => lot.total > 0)
      .sort((a, b) => b.soldPercentage - a.soldPercentage)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        revenueTrend,
        salesByLot,
        inventoryStatus
      }
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch chart data'
      }
    });
  }
};
