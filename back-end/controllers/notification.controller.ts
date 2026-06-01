import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Subscription, { ISubscription } from '../models/Subscription.model';
import Notification, {
  INotification,
  NotificationType,
} from '../models/Notifications.model';
import configureWebPush from '../config/webpush';
import { IUser } from '../interfaces/IUser';
import User from '../models/User.model';
const webpush = configureWebPush();
import 'dotenv/config';
import { detectDevice } from '../utils/deviceDetector';

// Interfaces para los tipos
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  type?: NotificationType;
  data?: any;
  icon?: string;
  lang?: string;
  image?: string;
  targetDevices?: ('all' | 'mobile' | 'desktop')[]; // Nuevo
  specificDeviceId?: string; // Nuevo
  scheduledTime?: string;
}

interface WebPushResponse {
  success: boolean;
  subscriptionId?: Types.ObjectId;
  deviceInfo?: {
    type: string;
    deviceId: string;
  };
  error?: string;
}

interface SendResult {
  totalDevices: number;
  successful: number;
  failed: number;
  devices: WebPushResponse[];
}

export const notificationController = {
  // Obtener dispositivos del usuario (NUEVO)
  getSubscriptionDevices: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }
      const query: any = { user: new Types.ObjectId(userId) };
      const devices = await Subscription.find(query)
        .sort({ 'deviceInfo.lastActive': -1 })
        .lean();

      res.status(200).json({
        success: true,
        payload: devices,
      });
    } catch (error) {
      console.error('❌ Error en getSubscriptionDevices:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Guardar suscripción de usuario
  subscribe: async (req: Request, res: Response): Promise<void> => {
    try {
      const subscription: PushSubscription = req.body;
      const { deviceId } = req.body; // Nuevo: recibir deviceId del frontend

      const userId = (req as any).user?.id?.toString();

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

      // Detectar información del dispositivo
      const deviceInfo = detectDevice(req.headers['user-agent'] || '');

      // Generar deviceId si no viene del frontend
      const finalDeviceId =
        deviceId ||
        `${deviceInfo.type}_${Date.now()}_${Math.random().toString(36)}`;

      // Verificar si ya existe la suscripción para este dispositivo
      const existingSubscription = await Subscription.findOne({
        user: new Types.ObjectId(userId),
        'deviceInfo.deviceId': finalDeviceId,
      });

      if (existingSubscription) {
        // Actualizar suscripción existente
        existingSubscription.endpoint = subscription.endpoint;
        existingSubscription.keys = subscription.keys;
        existingSubscription.expirationTime = subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null;
        existingSubscription.isActive = true;
        existingSubscription.deviceInfo.lastActive = new Date();

        await existingSubscription.save();

        res.status(200).json({
          success: true,
          message: 'Suscripción actualizada',
          deviceId: existingSubscription.deviceInfo.deviceId,
        });
        return;
      }

      // Crear nueva suscripción con info del dispositivo
      const newSubscription = new Subscription({
        user: new Types.ObjectId(userId),
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
        deviceInfo: {
          ...deviceInfo,
          deviceId: finalDeviceId,
          lastActive: new Date(),
        },
        isActive: true,
      });

      await newSubscription.save();

      res.status(201).json({
        success: true,
        message: 'Suscripción guardada correctamente',
        deviceId: newSubscription.deviceInfo.deviceId,
      });
    } catch (error) {
      console.error('❌ Error en subscribe:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
  // Eliminar suscripción de usuario
  unsubscribe: async (req: Request, res: Response): Promise<void> => {
    try {
      const { endpoint, deviceId } = req.body; // Aceptar deviceId
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const query: any = { user: new Types.ObjectId(userId) };

      if (deviceId) {
        query['deviceInfo.deviceId'] = deviceId;
      } else if (endpoint) {
        query.endpoint = endpoint;
      } else {
        res.status(400).json({
          success: false,
          message: 'Endpoint o deviceId requerido',
        });
        return;
      }

      await Subscription.findOneAndDelete(query);

      res.status(200).json({
        success: true,
        message: 'Suscripción eliminada correctamente',
      });
    } catch (error) {
      console.error('❌ Error en unsubscribe:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  send: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const payload: PushNotificationPayload = {
        title: 'Notificación de prueba',
        body: 'Esta es una notificación de prueba enviada desde el servidor.',
      };

      const results = await notificationController.sendPushNotification(
        new Types.ObjectId(userId),
        payload
      );

      res.status(200).json({
        success: true,
        message: 'Notificación de prueba enviada',
        results,
      });
    } catch (error) {
      console.error('❌ Error en send test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Enviar notificación inmediata (MEJORADO con multi-dispositivo)
  sendNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        body,
        type,
        data,
        icon,
        lang,
        targetDevices = ['all'], // Por defecto a todos
        specificDeviceId,
        image,
      }: PushNotificationPayload = req.body;

      const userId = (req as any).user?.id?.toString();

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
        data: {
          ...data,
          targetDevices,
          specificDeviceId,
        },
        status: 'pending' as const,
        icon: icon,
        lang: lang || 'es',
        image: image,
      });

      await notification.save();

      // Enviar notificación push a múltiples dispositivos
      const results = await notificationController.sendPushNotification(
        new Types.ObjectId(userId),
        {
          title,
          body,
          type,
          data,
          icon,
          lang,
          targetDevices,
          specificDeviceId,
          image,
        }
      );

      // Actualizar estado basado en resultados
      const successful = results.filter((r) => r.success).length;
      notification.status = successful > 0 ? 'sent' : 'failed';
      notification.sentAt = new Date();
      if (notification.data) {
        notification.data.sendResults = results; // Guardar directamente el array/objeto
      } else {
        notification.data = { sendResults: results };
      }
      await notification.save();

      res.status(200).json({
        success: true,
        message: 'Notificación enviada correctamente',
        notification,
        results: {
          totalDevices: results.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          devices: results,
        },
      });
    } catch (error) {
      console.error('❌ Error en sendNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Programar notificación (MEJORADO)
  scheduleNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        body,
        type,
        data,
        scheduledTime,
        targetDevices = ['all'],
        image,
      }: PushNotificationPayload = req.body;
      const userId = (req as any).user?.id?.toString();

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
        data: { ...data, targetDevices },
        scheduledFor: new Date(scheduledTime),
        status: 'pending' as const,
        image: image,
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
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Obtener notificaciones del usuario
  getUserNotifications: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id?.toString();
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
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Marcar notificación como leída
  markAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const notification = await Notification.findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId as string),
          user: new Types.ObjectId(userId as string),
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
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Eliminar notificación
  deleteNotification: async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const notification = await Notification.findOneAndDelete({
        _id: new Types.ObjectId(notificationId as string),
        user: new Types.ObjectId(userId as string),
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
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Función interna para enviar push notifications (MEJORADA para multi-dispositivo)
  sendPushNotification: async (
    userId: Types.ObjectId,
    payload: PushNotificationPayload
  ): Promise<WebPushResponse[]> => {
    try {
      // Obtener todas las suscripciones activas del usuario
      let subscriptions: ISubscription[] = await Subscription.find({
        user: userId,
        isActive: true,
      });

      // Filtrar por tipo de dispositivo si se especifica
      if (payload.targetDevices && !payload.targetDevices.includes('all')) {
        subscriptions = subscriptions.filter((sub) =>
          payload.targetDevices!.includes(sub.deviceInfo.type as any)
        );
      }

      // Filtrar por dispositivo específico
      if (payload.specificDeviceId) {
        subscriptions = subscriptions.filter(
          (sub) => sub.deviceInfo.deviceId === payload.specificDeviceId
        );
      }

      if (subscriptions.length === 0) {
        console.log(`No hay dispositivos activos para el usuario ${userId}`);
        return [];
      }

      console.log(
        `Enviando notificación a ${subscriptions.length} dispositivos del usuario ${userId}`
      );

      // Enviar a cada dispositivo
      const promises = subscriptions.map(
        async (subscription): Promise<WebPushResponse> => {
          try {
            // Añadir info del dispositivo al payload
            const enrichedPayload = {
              ...payload,
              data: {
                ...payload.data,
                deviceType: subscription.deviceInfo.type,
                deviceId: subscription.deviceInfo.deviceId,
                timestamp: Date.now(),
              },
            };

            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
              },
              JSON.stringify(enrichedPayload)
            );

            // Actualizar último acceso
            subscription.deviceInfo.lastActive = new Date();
            await subscription.save();

            return {
              success: true,
              subscriptionId: subscription._id as Types.ObjectId,
              deviceInfo: {
                type: subscription.deviceInfo.type,
                deviceId: subscription.deviceInfo.deviceId,
              },
            };
          } catch (error: any) {
            console.error(
              `❌ Error enviando a dispositivo ${subscription.deviceInfo.deviceId}:`,
              error
            );

            // Si la suscripción es inválida, desactivarla
            if (error.statusCode === 410) {
              await Subscription.findByIdAndUpdate(subscription._id, {
                isActive: false,
              });
            }

            return {
              success: false,
              subscriptionId: subscription._id as Types.ObjectId,
              deviceInfo: {
                type: subscription.deviceInfo.type,
                deviceId: subscription.deviceInfo.deviceId,
              },
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

  // send admin dynamic notification (MEJORADO)
  sendToAdmin: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        body,
        type,
        data,
        icon,
        targetDevices = ['all'],
        image,
      } = req.body;

      const userIdAdmin = new Types.ObjectId(process.env.ADMIN_ID || '');

      if (!title || !body) {
        res.status(400).json({
          success: false,
          message: 'Título y cuerpo son requeridos',
        });
        return;
      }

      // Verificar si el usuario existe
      const userExists = await User.findById(userIdAdmin);
      if (!userExists) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      // Guardar notificación en base de datos
      const notification = new Notification({
        user: userIdAdmin,
        title: title.trim(),
        body: body.trim(),
        type: type || 'system',
        data: { ...data, targetDevices },
        status: 'pending' as const,
        icon: icon,
        image: image,
      });

      await notification.save();

      // Enviar notificación push a múltiples dispositivos
      const results = await notificationController.sendPushNotification(
        userIdAdmin,
        {
          title,
          body,
          type,
          data,
          icon,
          targetDevices,
          image,
        }
      );

      // Actualizar estado
      notification.status = results.some((r) => r.success) ? 'sent' : 'failed';
      notification.sentAt = new Date();
      if (notification.data) {
        notification.data.sendResults = results; // Guardar directamente el array/objeto
      } else {
        notification.data = { sendResults: results };
      }
      await notification.save();

      res.status(200).json({
        success: true,
        message: 'Notificación enviada correctamente',
        notification,
        results: {
          totalDevices: results.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
        },
      });
    } catch (error) {
      console.error('❌ Error en sendToAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Desactivar dispositivo específico (NUEVO)
  deactivateDevice: async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const result = await Subscription.findOneAndUpdate(
        { user: new Types.ObjectId(userId), 'deviceInfo.deviceId': deviceId },
        { isActive: false },
        { new: true }
      );

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Dispositivo no encontrado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Dispositivo desactivado correctamente',
      });
    } catch (error) {
      console.error('❌ Error en deactivateDevice:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Eliminar todas las suscripciones de un usuario
  deleteAllSubscriptions: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const result = await Subscription.deleteMany({
        user: new Types.ObjectId(userId),
      });

      res.status(200).json({
        success: true,
        message: `${result.deletedCount} subscriptions successfully deleted`,
      });
    } catch (error) {
      console.error('❌ Error en deleteAllSubscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
};

export default notificationController;
