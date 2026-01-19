import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction';
import Lot from '../models/Lot';

// Zod schemas for validation
const soldItemSchema = z.object({
  color: z.string().min(1, 'Color is required'),
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  sellPricePerPiece: z.number().min(0, 'Sell price must be non-negative')
});

const createSaleSchema = z.object({
  lotId: z.string().min(1, 'Lot ID is required'),
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
        error: {
          code: 'AUTH_ERROR',
          message: 'Not authenticated'
        }
      });
    }

    const validatedData = createSaleSchema.parse(req.body);

    // Validate lot ID format
    if (!mongoose.Types.ObjectId.isValid(validatedData.lotId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid lot ID format'
        }
      });
    }

    // Fetch lot with session to lock the document
    const lot = await Lot.findOne({
      _id: validatedData.lotId,
      tenantId: req.user.tenantId
    }).session(session);

    if (!lot) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lot not found'
        }
      });
    }

    // Validate stock availability and calculate totals
    let totalRevenue = 0;
    let totalProfit = 0;
    const processedItems = [];

    for (const soldItem of validatedData.soldItems) {
      const colorItem = lot.items.find((item: any) => item.color === soldItem.color);

      if (!colorItem) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Color '${soldItem.color}' not found in lot`
          }
        });
      }

      const sizeItem = colorItem.sizes.find((s: any) => s.size === soldItem.size);

      if (!sizeItem) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Size '${soldItem.size}' not found for color '${soldItem.color}'`
          }
        });
      }

      if (sizeItem.remainingQuantity < soldItem.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${soldItem.color} - ${soldItem.size}. Available: ${sizeItem.remainingQuantity}, Requested: ${soldItem.quantity}`
          }
        });
      }

      const itemTotalAmount = soldItem.quantity * soldItem.sellPricePerPiece;
      totalRevenue += itemTotalAmount;

      // Calculate profit: (quantity × sell price) - (quantity × purchase price)
      const totalSellAmount = soldItem.quantity * soldItem.sellPricePerPiece;
      const totalPurchaseAmount = soldItem.quantity * sizeItem.purchaseCostPerPiece;
      const itemProfit = totalSellAmount - totalPurchaseAmount;
      totalProfit += itemProfit;

      processedItems.push({
        color: soldItem.color,
        size: soldItem.size,
        quantity: soldItem.quantity,
        sellPricePerPiece: soldItem.sellPricePerPiece,
        totalAmount: itemTotalAmount
      });

      // Update remaining quantity
      sizeItem.remainingQuantity -= soldItem.quantity;
    }

    // Update lot financials - accumulate profit based on actual margins, not revenue - investment
    lot.totalRevenue += totalRevenue;
    lot.totalProfit += totalProfit;
    await lot.save({ session });

    // Create transaction record
    const transaction = await Transaction.create([{
      tenantId: req.user.tenantId,
      lotId: validatedData.lotId,
      soldItems: processedItems,
      totalRevenue,
      soldBy: req.user.userId,
      customerName: validatedData.customerName,
      invoiceNumber: validatedData.invoiceNumber
    }], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: { transaction: transaction[0] }
    });
  } catch (error) {
    await session.abortTransaction();

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0].message,
          details: error.issues
        }
      });
    }

    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to process sale'
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
        error: {
          code: 'AUTH_ERROR',
          message: 'Not authenticated'
        }
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const lotId = req.query.lotId as string;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // If search is provided, use aggregation pipeline for better filtering
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      
      const pipeline: any[] = [
        // Match by tenant
        { $match: { tenantId: req.user.tenantId } },
        
        // Lookup lot details
        {
          $lookup: {
            from: 'lots',
            localField: 'lotId',
            foreignField: '_id',
            as: 'lotDetails'
          }
        },
        { $unwind: { path: '$lotDetails', preserveNullAndEmptyArrays: true } },
        
        // Lookup seller details
        {
          $lookup: {
            from: 'users',
            localField: 'soldBy',
            foreignField: '_id',
            as: 'sellerDetails'
          }
        },
        { $unwind: { path: '$sellerDetails', preserveNullAndEmptyArrays: true } },
        
        // Filter by search term across multiple fields
        {
          $match: {
            $or: [
              { 'lotDetails.lotNumber': searchRegex },
              { customerName: searchRegex },
              { invoiceNumber: searchRegex },
              { 'sellerDetails.name': searchRegex },
              { 'sellerDetails.email': searchRegex }
            ]
          }
        },
        
        // Add filter by specific lot ID if provided
        ...(lotId && mongoose.Types.ObjectId.isValid(lotId) 
          ? [{ $match: { lotId: new mongoose.Types.ObjectId(lotId) } }] 
          : []
        ),
        
        // Sort by creation date
        { $sort: { createdAt: -1 } },
        
        // Facet for pagination
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              { $limit: limit },
              // Project to match the expected format
              {
                $project: {
                  _id: 1,
                  tenantId: 1,
                  soldItems: 1,
                  totalRevenue: 1,
                  customerName: 1,
                  invoiceNumber: 1,
                  createdAt: 1,
                  lotId: {
                    _id: '$lotDetails._id',
                    lotNumber: '$lotDetails.lotNumber'
                  },
                  soldBy: {
                    _id: '$sellerDetails._id',
                    name: '$sellerDetails.name',
                    email: '$sellerDetails.email'
                  }
                }
              }
            ]
          }
        }
      ];

      const result = await Transaction.aggregate(pipeline);
      const transactions = result[0]?.data || [];
      const total = result[0]?.metadata[0]?.total || 0;

      return res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    }

    // No search - use simple query with pagination
    const query: any = { tenantId: req.user.tenantId };
    
    if (lotId) {
      if (!mongoose.Types.ObjectId.isValid(lotId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid lot ID format'
          }
        });
      }
      query.lotId = lotId;
    }

    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('lotId', 'lotNumber')
        .populate('soldBy', 'name email'),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch transactions'
      }
    });
  }
};

export const getTransaction = async (req: Request, res: Response) => {
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

    const { id } = req.params;

    // Validate ObjectId
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid transaction ID'
        }
      });
    }

    // Find transaction and enforce tenant isolation
    const transaction = await Transaction.findOne({
      _id: id,
      tenantId: req.user.tenantId
    })
      .populate('lotId', 'lotNumber')
      .populate('soldBy', 'name email');

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
        message: 'Failed to fetch transaction'
      }
    });
  }
};
