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
