import { Schema, model } from 'mongoose';
import { IVeterinary } from '../interfaces/IVeterinary';

const VeterinarySchema = new Schema<IVeterinary>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

VeterinarySchema.index({ name: 'text', email: 'text' });
VeterinarySchema.index({ isActive: 1 });
VeterinarySchema.index({ email: 1 });

export default model<IVeterinary>('Veterinary', VeterinarySchema);
