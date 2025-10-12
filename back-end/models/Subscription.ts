// const mongoose = require('mongoose');

// const subscriptionSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   endpoint: {
//     type: String,
//     required: true
//   },
//   keys: {
//     p256dh: {
//       type: String,
//       required: true
//     },
//     auth: {
//       type: String,
//       required: true
//     }
//   },
//   expirationTime: {
//     type: Date,
//     default: null
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   }
// }, {
//   timestamps: true
// });

// // Índice compuesto para mejor performance
// subscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });

// module.exports = mongoose.model('Subscription', subscriptionSchema);
import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscription extends Document {
  user: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: Date | null; // Cambiado a Date según tu modelo
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Según tu modelo
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    expirationTime: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto para mejor performance (igual que tu modelo)
SubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });

// Índices adicionales para consultas comunes
SubscriptionSchema.index({ isActive: 1 });
SubscriptionSchema.index({ user: 1, isActive: 1 });

// Método estático para buscar suscripciones activas por usuario
SubscriptionSchema.statics.findActiveByUser = function (
  userId: Types.ObjectId
): Promise<ISubscription[]> {
  return this.find({
    user: userId,
    isActive: true,
  }).exec();
};

// Método para desactivar suscripción
SubscriptionSchema.methods.deactivate = function (): Promise<ISubscription> {
  this.isActive = false;
  return this.save();
};

export default model<ISubscription>('Subscription', SubscriptionSchema);
