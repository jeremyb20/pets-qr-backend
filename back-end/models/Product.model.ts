import { Schema, model, Document, Types } from 'mongoose';
import { IProduct, IRating, ILabel } from '../types/product.types';

const ratingSchema = new Schema<IRating>({
  name: {
    type: String,
    required: true,
  },
  starCount: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const labelSchema = new Schema<ILabel>({
  enabled: {
    type: Boolean,
    default: false,
  },
  content: {
    type: String,
    default: '',
  },
});

const productSchema = new Schema<IProduct>(
  {
    sku: {
      type: String,
      required: [true, 'El SKU es requerido'],
      unique: true, // ✅ Esto crea un índice único automáticamente
      trim: true,
      uppercase: true,
      // ❌ REMOVER: index: true (si lo tenías)
    },
    productId: {
      type: Number,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del producto es requerido'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'El código es requerido'],
      unique: true, // ✅ Esto crea un índice único automáticamente
      trim: true,
      // ❌ REMOVER: index: true (si lo tenías)
    },
    taxes: {
      type: Number,
      default: 0,
      min: [0, 'Los impuestos no pueden ser negativos'],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    colors: [
      {
        type: String,
        trim: true,
      },
    ],
    gender: [
      {
        type: String,
        trim: true,
      },
    ],
    sizes: [
      {
        type: String,
        trim: true,
      },
    ],
    publish: {
      type: String,
      required: [true, 'El estado de publicación es requerido'],
      enum: {
        values: ['published', 'draft', 'archived'],
        message:
          'El estado de publicación debe ser: published, draft o archived',
      },
      default: 'draft',
    },
    coverUrl: {
      type: String,
      required: [true, 'La imagen principal es requerida'],
    },
    // images: [
    //   {
    //     type: String,
    //   },
    // ],
    images: [
      {
        imageURL: { type: String, required: false },
        image_id: { type: String, required: false },
      },
    ],
    quantity: {
      type: Number,
      required: [true, 'La cantidad es requerida'],
      min: [0, 'La cantidad no puede ser negativa'],
    },
    category: {
      type: String,
      required: [true, 'La categoría es requerida'],
      trim: true,
    },
    available: {
      type: Number,
      default: 0,
      min: [0, 'El disponible no puede ser negativo'],
    },
    totalSold: {
      type: Number,
      default: 0,
      min: [0, 'El total vendido no puede ser negativo'],
    },
    description: {
      type: String,
      required: [true, 'La descripción es requerida'],
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: [0, 'El total de ratings no puede ser negativo'],
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'El total de reviews no puede ser negativo'],
    },
    inventoryType: {
      type: String,
      required: [true, 'El tipo de inventario es requerido'],
      enum: {
        values: ['in_stock', 'low_stock', 'out_of_stock'],
        message:
          'El tipo de inventario debe ser: in_stock, low_stock o out_of_stock',
      },
      default: 'in_stock',
    },
    subDescription: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'El precio es requerido'],
      min: [0, 'El precio no puede ser negativo'],
    },
    priceSale: {
      type: Number,
      // validate: {
      //   validator: function (value) {
      //     // Permitir que priceSale sea mayor O menor que price
      //     // según tu lógica de negocio
      //     return Number(value) > 0; // O la validación que necesites
      //   },
      //   message: 'El precio de venta debe ser válido',
      // },
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ProductReview',
      },
    ],
    ratings: [ratingSchema],
    saleLabel: {
      type: labelSchema,
      default: () => ({}),
    },
    newLabel: {
      type: labelSchema,
      default: () => ({}),
    },
    createdAt: {
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
productSchema.virtual('id').get(function (this: Document) {
  return (this._id as Types.ObjectId).toHexString();
});

// Middleware para calcular el inventoryType automáticamente
productSchema.pre('save', function (next) {
  if (this.quantity > 10) {
    this.inventoryType = 'in_stock';
  } else if (this.quantity > 0 && this.quantity <= 10) {
    this.inventoryType = 'low_stock';
  } else {
    this.inventoryType = 'out_of_stock';
  }
  next();
});

// ✅ ÍNDICES CORREGIDOS - Solo definir una vez por campo
// Remover índices duplicados que ya están definidos por 'unique: true'

// Índices simples (para campos sin 'unique: true')
productSchema.index({ category: 1 });
productSchema.index({ gender: 1 });
productSchema.index({ price: 1 });
productSchema.index({ publish: 1 });
productSchema.index({ inventoryType: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ totalSold: -1 });

// Índices compuestos (para consultas frecuentes)
productSchema.index({ category: 1, gender: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ gender: 1, price: 1 });
productSchema.index({ category: 1, publish: 1 });
productSchema.index({ gender: 1, publish: 1 });

// ❌ NO incluir estos índices aquí porque ya se crean con 'unique: true'
// productSchema.index({ sku: 1 }); // DUPLICADO - ya existe por unique: true
// productSchema.index({ code: 1 }); // DUPLICADO - ya existe por unique: true

export const Product = model<IProduct>('Product', productSchema);
