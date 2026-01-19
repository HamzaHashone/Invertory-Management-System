import { Request, Response } from 'express';
import { z } from 'zod';
import Lot from '../models/Lot';
import Tenant from '../models/Tenant';
import mongoose from 'mongoose';

// Zod schemas for validation
const sizeSchema = z.object({
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  purchaseCostPerPiece: z.number().min(0, 'Purchase cost must be non-negative'),
  sellCostPerPiece: z.number().min(0, 'Sell cost must be non-negative')
});

const colorSchema = z.object({
  color: z.string().min(1, 'Color is required'),
  sizes: z.array(sizeSchema).min(1, 'At least one size is required')
});

const createLotSchema = z.object({
  lotNumber: z.string().min(1, 'Lot number is required'),
  items: z.array(colorSchema).min(1, 'At least one item is required')
});

export const createLot = async (req: Request, res: Response) => {
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

    // Calculate total investment and prepare items
    let totalInvestment = 0;
    const items = validatedData.items.map(colorItem => {
      const sizes = colorItem.sizes.map(sizeItem => {
        const investment = sizeItem.quantity * sizeItem.purchaseCostPerPiece;
        totalInvestment += investment;

        return {
          size: sizeItem.size,
          quantity: sizeItem.quantity,
          remainingQuantity: sizeItem.quantity,
          purchaseCostPerPiece: sizeItem.purchaseCostPerPiece,
          sellCostPerPiece: sizeItem.sellCostPerPiece
        };
      });

      return {
        color: colorItem.color,
        sizes
      };
    });

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
          message: error.issues[0].message,
          details: error.issues
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
        error: {
          code: 'AUTH_ERROR',
          message: 'Not authenticated'
        }
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { tenantId: req.user.tenantId };
    if (search) {
      query.lotNumber = { $regex: search, $options: 'i' };
    }

    // Execute query with pagination
    const [lots, total] = await Promise.all([
      Lot.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email'),
      Lot.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        lots,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get lots error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch lots'
      }
    });
  }
};

export const getLot = async (req: Request, res: Response) => {
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
          message: 'Invalid lot ID'
        }
      });
    }

    // Find lot and enforce tenant isolation
    const lot = await Lot.findOne({
      _id: id,
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
        message: 'Failed to fetch lot'
      }
    });
  }
};

export const updateLot = async (req: Request, res: Response) => {
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
          message: 'Invalid lot ID'
        }
      });
    }

    const validatedData = createLotSchema.parse(req.body);

    // Find existing lot
    const existingLot = await Lot.findOne({
      _id: id,
      tenantId: req.user.tenantId
    });

    if (!existingLot) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lot not found'
        }
      });
    }

    // Check if lot number is being changed and if new number already exists
    if (validatedData.lotNumber !== existingLot.lotNumber) {
      const duplicateLot = await Lot.findOne({
        tenantId: req.user.tenantId,
        lotNumber: validatedData.lotNumber,
        _id: { $ne: id }
      });

      if (duplicateLot) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Lot number already exists'
          }
        });
      }
    }

    // Calculate total investment
    let totalInvestment = 0;
    const processedItems = validatedData.items.map((item: any) => {
      const processedSizes = item.sizes.map((size: any) => {
        const itemInvestment = size.quantity * size.purchaseCostPerPiece;
        totalInvestment += itemInvestment;

        return {
          size: size.size,
          quantity: size.quantity,
          remainingQuantity: size.quantity,
          purchaseCostPerPiece: size.purchaseCostPerPiece,
          sellCostPerPiece: size.sellCostPerPiece
        };
      });

      return {
        color: item.color,
        sizes: processedSizes
      };
    });

    // Update lot
    existingLot.lotNumber = validatedData.lotNumber;
    existingLot.items = processedItems;
    existingLot.totalInvestment = totalInvestment;

    await existingLot.save();

    res.json({
      success: true,
      data: { lot: existingLot },
      message: 'Lot updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          details: error.issues
        }
      });
    }

    console.error('Update lot error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update lot'
      }
    });
  }
};

export const generateLotNumber = async (req: Request, res: Response) => {
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

    // Get tenant to retrieve lot prefix
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }

    const prefix = tenant.settings.lotPrefix || 'LOT-';

    // Find the highest lot number for this tenant
    const lastLot = await Lot.findOne({ tenantId: req.user.tenantId })
      .sort({ createdAt: -1 })
      .select('lotNumber');

    let nextNumber = 1;
    if (lastLot) {
      // Extract number from last lot number (e.g., "LOT-0005" -> 5)
      const match = lastLot.lotNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with padding (e.g., 5 -> "0005")
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    const lotNumber = `${prefix}${paddedNumber}`;

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

export const deleteLot = async (req: Request, res: Response) => {
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
          message: 'Invalid lot ID'
        }
      });
    }

    // Find lot with tenant validation
    const lot = await Lot.findOne({
      _id: id,
      tenantId: req.user.tenantId
    });

    if (!lot) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lot not found'
        }
      });
    }

    // Authorization check (admin or creator only)
    if (req.user.role !== 'admin' && lot.createdBy.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this lot'
        }
      });
    }

    // Permanent delete
    await Lot.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Lot deleted successfully'
    });
  } catch (error) {
    console.error('Delete lot error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete lot'
      }
    });
  }
};
