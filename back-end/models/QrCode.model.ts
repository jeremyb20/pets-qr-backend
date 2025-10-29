// back-end/models/QrCode.model.ts
import { Schema, model, Types } from 'mongoose';
import { IQrCode } from '../interfaces/IQrCode';

const QrCodeSchema = new Schema<IQrCode>(
  {
    randomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'activated', 'pending'],
      default: 'available',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedPet: {
      type: Schema.Types.ObjectId,
      ref: 'Pet',
      default: null,
    },
    activatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    activationDate: {
      type: Date,
      default: null,
    },
    purchaseInfo: {
      soldDate: {
        type: Date,
        default: null,
      },
      price: {
        type: Number,
        default: 0,
      },
      seller: {
        type: String,
        default: '',
      },
    },
    hostName: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Índices
// QrCodeSchema.index({ randomCode: 1 });
QrCodeSchema.index({ assignedTo: 1 });
QrCodeSchema.index({ status: 1 });
QrCodeSchema.index({ assignedPet: 1 });

export default model<IQrCode>('QrCode', QrCodeSchema);
