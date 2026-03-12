import { Schema, model, Document, Types } from 'mongoose';

// Tipos para la notificación
export type NotificationType =
  | 'system'
  | 'reminder'
  | 'alert'
  | 'promotional'
  | 'order'
  | 'chat'
  | 'mail'
  | 'delivery'
  | 'schedule';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'canceled';

export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, any>; // Map en lugar de Object
  scheduledFor?: Date;
  sentAt?: Date;
  status: NotificationStatus;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  icon?: string;
  lang?: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Referencia a User según tu modelo
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'system',
        'reminder',
        'alert',
        'promotional',
        'order',
        'chat',
        'mail',
        'delivery',
        'schedule',
      ],
      default: 'system',
    },
    data: {
      type: Schema.Types.Mixed, // CAMBIADO: de Map a Mixed
      default: {},
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'canceled'],
      default: 'pending',
    },
    read: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: '',
    },
    lang: {
      type: String,
      default: 'es',
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas eficientes (igual que tu modelo)
NotificationSchema.index({ user: 1, status: 1 });
NotificationSchema.index({ scheduledFor: 1, status: 1 });
NotificationSchema.index({ createdAt: -1 });

// Método de instancia para marcar como leída
NotificationSchema.methods.markAsRead = function (): Promise<INotification> {
  this.read = true;
  return this.save();
};

// Método estático para buscar notificaciones por usuario
NotificationSchema.statics.findByUser = function (
  userId: Types.ObjectId,
  limit: number = 50
): Promise<INotification[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

// Método estático para notificaciones pendientes
NotificationSchema.statics.findPendingNotifications = function (): Promise<
  INotification[]
> {
  const now = new Date();
  return this.find({
    status: 'pending',
    $or: [{ scheduledFor: { $lte: now } }, { scheduledFor: null }],
  })
    .populate('user')
    .exec();
};

export default model<INotification>('Notification', NotificationSchema);
