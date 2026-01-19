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
