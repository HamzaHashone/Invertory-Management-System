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
