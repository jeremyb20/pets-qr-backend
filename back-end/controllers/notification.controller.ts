import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Subscription, { ISubscription } from '../models/Subscription';
import Notification, {
  INotification,
  NotificationType,
} from '../models/Notifications';
import configureWebPush from '../config/webpush';
import { IUser } from '../models/User';

const webpush = configureWebPush();

// Interfaces para los tipos
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  type?: string;
  data?: any;
}

interface SendNotificationRequest {
  title: string;
  body: string;
  type?: NotificationType;
  data?: any;
}

interface ScheduleNotificationRequest {
  title: string;
  body: string;
  type?: NotificationType;
  data?: any;
  scheduledTime: string;
}

interface WebPushResponse {
  success: boolean;
  subscriptionId?: Types.ObjectId;
  error?: string;
}

export const notificationController = {
  // Guardar suscripción de usuario
  subscribe: async (req: Request, res: Response): Promise<void> => {
    try {
      const subscription: PushSubscription = req.body;

      console.log('Nueva suscripción recibida:', req.user);

      // Acceso seguro al _id
      const userId = (req.user as IUser)?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      if (!subscription || !subscription.endpoint) {
        res.status(400).json({
          success: false,
          message: 'Datos de suscripción inválidos',
        });
        return;
      }

      // Verificar si ya existe la suscripción
      const existingSubscription = await Subscription.findOne({
        user: new Types.ObjectId(userId),
        endpoint: subscription.endpoint,
      });

      if (existingSubscription) {
        res.status(200).json({
          success: true,
          message: 'Suscripción ya existente',
        });
        return;
      }

      // Crear nueva suscripción
      const newSubscription = new Subscription({
        user: new Types.ObjectId(userId),
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime || null,
        isActive: true,
      });

      await newSubscription.save();

      res.status(201).json({
        success: true,
        message: 'Suscripción guardada correctamente',
      });
    } catch (error) {
      console.error('❌ Error en subscribe:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  // Enviar notificación inmediata
  sendNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, body, type, data }: SendNotificationRequest = req.body;
      const userId = (req.user as IUser)?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      if (!title || !body) {
        res.status(400).json({
          success: false,
          message: 'Título y cuerpo son requeridos',
        });
        return;
      }

      // Guardar en base de datos
      const notification = new Notification({
        user: new Types.ObjectId(userId),
        title: title.trim(),
        body: body.trim(),
        type: type || 'system',
        data: data || new Map(),
        status: 'pending' as const,
      });

      await notification.save();

      // Enviar notificación push
      await notificationController.sendPushNotification(
        new Types.ObjectId(userId),
        { title, body, type, data }
      );

      // Actualizar estado a enviado
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      res.status(200).json({
        success: true,
        message: 'Notificación enviada correctamente',
        notification,
      });
    } catch (error) {
      console.error('❌ Error en sendNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  // Programar notificación
  scheduleNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        body,
        type,
        data,
        scheduledTime,
      }: ScheduleNotificationRequest = req.body;
      const userId = (req.user as IUser)?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      if (!scheduledTime || new Date(scheduledTime) <= new Date()) {
        res.status(400).json({
          success: false,
          message: 'Fecha de programación inválida',
        });
        return;
      }

      const notification = new Notification({
        user: new Types.ObjectId(userId),
        title: title.trim(),
        body: body.trim(),
        type: type || 'system',
        data: data || new Map(),
        scheduledFor: new Date(scheduledTime),
        status: 'pending' as const,
      });

      await notification.save();

      res.status(201).json({
        success: true,
        message: 'Notificación programada correctamente',
        payload: notification,
      });
    } catch (error) {
      console.error('❌ Error en scheduleNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  // Obtener notificaciones del usuario
  getUserNotifications: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as IUser)?.id?.toString();
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const query: any = { user: new Types.ObjectId(userId) };
      if (unreadOnly === 'true') {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean();

      const total = await Notification.countDocuments(query);

      res.status(200).json({
        payload: notifications,
        success: true,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        total,
      });
    } catch (error) {
      console.error('❌ Error en getUserNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  // Marcar notificación como leída
  markAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const userId = (req.user as IUser)?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const notification = await Notification.findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          user: new Types.ObjectId(userId),
        },
        { read: true },
        { new: true }
      );

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notificación no encontrada',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notificación marcada como leída',
        notification,
      });
    } catch (error) {
      console.error('❌ Error en markAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  // Eliminar notificación
  deleteNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const userId = (req.user as IUser)?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const notification = await Notification.findOneAndDelete({
        _id: new Types.ObjectId(notificationId),
        user: new Types.ObjectId(userId),
      });

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notificación no encontrada',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notificación eliminada correctamente',
      });
    } catch (error) {
      console.error('❌ Error en deleteNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  },

  // Función interna para enviar push notifications
  sendPushNotification: async (
    userId: Types.ObjectId,
    payload: PushNotificationPayload
  ): Promise<WebPushResponse[]> => {
    try {
      const subscriptions: ISubscription[] = await Subscription.find({
        user: userId,
        isActive: true,
      });

      const promises = subscriptions.map(
        async (subscription): Promise<WebPushResponse> => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
              },
              JSON.stringify(payload)
            );

            return {
              success: true,
              subscriptionId: subscription._id as Types.ObjectId,
            };
          } catch (error: any) {
            console.error('❌ Error enviando notificación push:', error);

            // Si la suscripción es inválida, desactivarla
            if (error.statusCode === 410) {
              await Subscription.findByIdAndUpdate(subscription._id, {
                isActive: false,
              });
            }

            return {
              success: false,
              error: error.message,
            };
          }
        }
      );

      return await Promise.all(promises);
    } catch (error) {
      console.error('❌ Error en sendPushNotification:', error);
      throw error;
    }
  },
};

export default notificationController;
