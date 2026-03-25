// models/Promotion.ts
import { Schema, model, Document, Model } from 'mongoose';

export interface IPromotion extends Document {
  title: string;
  description: string;
  discount: number;
  validFrom: Date;
  validUntil: Date;
  urlImage?: string;
  urlImageId?: string; // ID de Cloudinary o servicio de imágenes
  icon?: string;
  status: 'active' | 'inactive' | 'expired';
  priority: number; // Para ordenar promociones (mayor número = más importante)
  type: 'vaccine' | 'grooming' | 'consultation' | 'products' | 'general';
  termsAndConditions?: string;
  applicableTo: string[]; // IDs de servicios o productos aplicables
  code?: string; // Código promocional opcional
  usageLimit?: number; // Límite de usos
  usedCount: number; // Veces usada
  createdAt: Date;
  updatedAt: Date;
  link: string;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    urlImage: {
      type: String,
      required: false,
    },
    urlImageId: {
      type: String,
      required: false,
    },
    icon: {
      type: String,
      required: false,
      default: 'mdi:tag',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active',
    },
    priority: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['vaccine', 'grooming', 'consultation', 'products', 'general'],
      default: 'general',
    },
    termsAndConditions: {
      type: String,
      required: false,
    },
    applicableTo: {
      type: [String],
      required: false,
      default: [],
    },
    code: {
      type: String,
      required: false,
      unique: true, // Esto ya crea un índice único
      sparse: true, // Permite múltiples documentos con valor null/undefined
    },
    usageLimit: {
      type: Number,
      required: false,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    link: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices adicionales (sin duplicar el de code)
PromotionSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
PromotionSchema.index({ priority: -1 });
PromotionSchema.index({ type: 1 });
// NOTA: No necesitas index para 'code' porque ya está definido con unique: true arriba

// Método estático para obtener promociones activas
PromotionSchema.statics.getActivePromotions = async function () {
  const now = new Date();
  return this.find({
    status: 'active',
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .exec();
};

// Método estático para obtener promoción destacada (prioridad más alta)
PromotionSchema.statics.getFeaturedPromotion = async function () {
  const now = new Date();
  return this.findOne({
    status: 'active',
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .exec();
};

// Middleware para actualizar status automáticamente
PromotionSchema.pre('save', function (next) {
  const now = new Date();
  if (this.validUntil < now) {
    this.status = 'expired';
  }
  next();
});

// Middleware para actualizar status antes de actualizar
PromotionSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (update.validUntil) {
    const now = new Date();
    if (new Date(update.validUntil) < now) {
      update.status = 'expired';
    }
  }
  next();
});

interface IPromotionModel extends Model<IPromotion> {
  getActivePromotions(): Promise<IPromotion[]>;
  getFeaturedPromotion(): Promise<IPromotion | null>;
}

export default model<IPromotion, IPromotionModel>('Promotion', PromotionSchema);
