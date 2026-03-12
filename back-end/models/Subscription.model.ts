// import { Schema, model, Document, Types } from 'mongoose';

// export interface ISubscription extends Document {
//   user: Types.ObjectId;
//   endpoint: string;
//   keys: {
//     p256dh: string;
//     auth: string;
//   };
//   expirationTime?: Date | null; // Cambiado a Date según tu modelo
//   isActive: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const SubscriptionSchema = new Schema<ISubscription>(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User', // Según tu modelo
//       required: true,
//     },
//     endpoint: {
//       type: String,
//       required: true,
//     },
//     keys: {
//       p256dh: {
//         type: String,
//         required: true,
//       },
//       auth: {
//         type: String,
//         required: true,
//       },
//     },
//     expirationTime: {
//       type: Date,
//       default: null,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Índice compuesto para mejor performance (igual que tu modelo)
// SubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });

// // Índices adicionales para consultas comunes
// SubscriptionSchema.index({ isActive: 1 });
// SubscriptionSchema.index({ user: 1, isActive: 1 });

// // Método estático para buscar suscripciones activas por usuario
// SubscriptionSchema.statics.findActiveByUser = function (
//   userId: Types.ObjectId
// ): Promise<ISubscription[]> {
//   return this.find({
//     user: userId,
//     isActive: true,
//   }).exec();
// };

// // Método para desactivar suscripción
// SubscriptionSchema.methods.deactivate = function (): Promise<ISubscription> {
//   this.isActive = false;
//   return this.save();
// };

// export default model<ISubscription>('Subscription', SubscriptionSchema);

// models/Subscription.ts
// models/Subscription.ts (mejorado)
import { Schema, model, Document, Types } from 'mongoose';

export type DeviceType = 'mobile' | 'desktop' | 'tablet';
export type PlatformType = 'web' | 'ios' | 'android';

export interface ISubscription extends Document {
  user: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: Date | null;
  deviceInfo: {
    type: DeviceType;
    platform: PlatformType;
    userAgent: string;
    browser?: string;
    os?: string;
    deviceId: string; // Identificador único del dispositivo
    lastActive: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    deviceInfo: {
      type: {
        type: String,
        enum: ['mobile', 'desktop', 'tablet'],
        required: true,
      },
      platform: {
        type: String,
        enum: ['web', 'ios', 'android'],
        required: true,
      },
      userAgent: { type: String, required: true },
      browser: String,
      os: String,
      deviceId: { type: String, required: true },
      lastActive: { type: Date, default: Date.now },
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

// Índices compuestos para multi-dispositivo
SubscriptionSchema.index(
  { user: 1, 'deviceInfo.deviceId': 1 },
  { unique: true }
);
SubscriptionSchema.index({ user: 1, isActive: 1 });
SubscriptionSchema.index({ 'deviceInfo.lastActive': -1 });
SubscriptionSchema.index({ endpoint: 1 }, { unique: true });

// Método estático para obtener todas las suscripciones activas de un usuario
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

// Método para actualizar último acceso
SubscriptionSchema.methods.updateLastActive =
  function (): Promise<ISubscription> {
    this.deviceInfo.lastActive = new Date();
    return this.save();
  };

export default model<ISubscription>('Subscription', SubscriptionSchema);
