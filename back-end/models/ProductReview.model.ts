import { Schema, model, Document, Types } from 'mongoose';
import { IProductReview } from '../types/product.types';

const productReviewSchema = new Schema<IProductReview>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'La calificación es requerida'],
      min: [1, 'La calificación mínima es 1'],
      max: [5, 'La calificación máxima es 5'],
    },
    comment: {
      type: String,
      required: [true, 'El comentario es requerido'],
      trim: true,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    isPurchased: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: String,
      },
    ],
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      trim: true,
      lowercase: true,
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual para el id
productReviewSchema.virtual('id').get(function (this: Document) {
  return (this._id as Types.ObjectId).toHexString();
});

// ✅ ÍNDICES CORREGIDOS - Sin duplicados
productReviewSchema.index({ rating: 1 });
productReviewSchema.index({ postedAt: -1 });
productReviewSchema.index({ email: 1 });

export const ProductReview = model<IProductReview>(
  'ProductReview',
  productReviewSchema
);
