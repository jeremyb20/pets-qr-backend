// services/pushNotification.service.ts
import webpush from 'web-push';
import Subscription, { ISubscription } from '../models/Subscription.model';
import Notification from '../models/Notifications.model';
import { Types } from 'mongoose';

// Configurar VAPID
webpush.setVapidDetails(
  'mailto:tu-email@dominio.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: any[];
  requireInteraction?: boolean;
  vibrate?: number[];
  targetDevices?: ('all' | 'mobile' | 'desktop' | 'tablet')[];
  specificDeviceId?: string; // Para enviar a un dispositivo específico
}

export class PushNotificationService {
  /**
   * Enviar notificación a TODOS los dispositivos de un usuario
   */
  static async sendToUser(
    userId: Types.ObjectId | string,
    notificationData: PushNotificationData,
    saveNotification: boolean = true
  ) {
    try {
      // Obtener todas las suscripciones activas del usuario
      const subscriptions = await Subscription.find({
        user: userId,
        isActive: true,
      });

      if (!subscriptions.length) {
        console.log(`Usuario ${userId} no tiene suscripciones activas`);
        return [];
      }

      // Filtrar por tipo de dispositivo si se especifica
      let targetSubscriptions = subscriptions;
      if (
        notificationData.targetDevices &&
        !notificationData.targetDevices.includes('all')
      ) {
        targetSubscriptions = subscriptions.filter((sub) =>
          notificationData.targetDevices!.includes(sub.deviceInfo.type)
        );
      }

      // Filtrar por dispositivo específico
      if (notificationData.specificDeviceId) {
        targetSubscriptions = targetSubscriptions.filter(
          (sub) => sub.deviceInfo.deviceId === notificationData.specificDeviceId
        );
      }

      console.log(
        `Enviando notificación a ${targetSubscriptions.length} dispositivos del usuario ${userId}`
      );

      // Guardar en BD si se requiere
      let savedNotification = null;
      if (saveNotification) {
        savedNotification = await Notification.create({
          user: userId,
          title: notificationData.title,
          body: notificationData.body,
          type: notificationData.data?.type || 'system',
          data: notificationData.data || {},
          status: 'pending',
          icon: notificationData.icon,
        });
      }

      // Enviar a cada dispositivo
      const results = await Promise.allSettled(
        targetSubscriptions.map((sub) =>
          this.sendToDevice(
            sub,
            notificationData,
            savedNotification?._id as Types.ObjectId | undefined
          )
        )
      );

      // Procesar resultados y limpiar suscripciones expiradas
      const failedEndpoints: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const error: any = result.reason;
          if (error.statusCode === 410) {
            // Suscripción expirada
            failedEndpoints.push(targetSubscriptions[index].endpoint);
          }
          console.error(`Error enviando a dispositivo:`, error);
        }
      });

      // Limpiar suscripciones expiradas
      if (failedEndpoints.length > 0) {
        await Subscription.updateMany(
          { endpoint: { $in: failedEndpoints } },
          { isActive: false }
        );
      }

      // Actualizar estado de la notificación
      if (savedNotification) {
        const successful = results.filter(
          (r) => r.status === 'fulfilled'
        ).length;
        savedNotification.status = successful > 0 ? 'sent' : 'failed';
        savedNotification.sentAt = new Date();
        await savedNotification.save();
      }

      return {
        total: targetSubscriptions.length,
        successful: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
        notificationId: savedNotification?._id,
      };
    } catch (error) {
      console.error('Error en sendToUser:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación a un dispositivo específico
   */
  private static async sendToDevice(
    subscription: ISubscription,
    notificationData: PushNotificationData,
    notificationId?: Types.ObjectId
  ) {
    const payload = JSON.stringify({
      title: notificationData.title,
      body: notificationData.body,
      icon:
        notificationData.icon ||
        'https://plaquitascr.com/assets/images/plaquitascr.png',
      badge:
        notificationData.badge ||
        'https://plaquitascr.com/assets/images/plaquitascr.png',
      tag: notificationData.tag || `notif-${Date.now()}`,
      data: {
        ...notificationData.data,
        notificationId,
        deviceType: subscription.deviceInfo.type,
        deviceId: subscription.deviceInfo.deviceId,
        timestamp: Date.now(),
      },
      actions: notificationData.actions || [
        {
          action: 'open',
          title: 'Abrir',
        },
      ],
      requireInteraction: notificationData.requireInteraction || false,
      vibrate: notificationData.vibrate || [200, 100, 200],
    });

    // Actualizar último acceso
    subscription.deviceInfo.lastActive = new Date();
    await subscription.save();

    return webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payload
    );
  }

  /**
   * Enviar notificación a múltiples usuarios
   */
  static async sendToMultipleUsers(
    userIds: (Types.ObjectId | string)[],
    notificationData: PushNotificationData
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, notificationData, true))
    );

    return {
      total: userIds.length,
      successful: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      details: results,
    };
  }
}
