import cron from 'node-cron';
import { Types } from 'mongoose';
import Notification, { INotification } from '../models/Notifications.model';
import {
  notificationController,
  PushNotificationPayload,
} from '../controllers/notification.controller';

class NotificationScheduler {
  constructor() {
    this.init();
  }

  private init(): void {
    // Ejecutar cada minuto para verificar notificaciones pendientes
    cron.schedule('* * * * *', this.checkScheduledNotifications.bind(this));

    // Limpieza diaria de notificaciones antiguas
    cron.schedule('0 0 * * *', this.cleanOldNotifications.bind(this));

    console.log('✅ Notification scheduler initialized');
  }

  private async checkScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();

      const notifications: INotification[] = await Notification.find({
        scheduledFor: { $lte: now },
        status: 'pending',
      }).populate('user');

      // console.log(
      //   `🔍 Checking scheduled notifications: ${notifications.length} found`
      // );

      for (const notification of notifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error('❌ Error en checkScheduledNotifications:', error);
    }
  }

  private async processNotification(
    notification: INotification
  ): Promise<void> {
    try {
      if (!notification.user || !(notification.user as any)._id) {
        console.warn(`⚠️ Notification ${notification._id} has no valid user`);
        notification.status = 'failed';
        await notification.save();
        return;
      }

      const userId: Types.ObjectId = (notification.user as any)._id;

      const pushPayload: PushNotificationPayload = {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        icon: notification.icon,
      };

      await notificationController.sendPushNotification(userId, pushPayload);

      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      console.log(`✅ Notificación enviada: ${notification._id}`);
    } catch (error) {
      console.error(
        `❌ Error enviando notificación ${notification._id}:`,
        error
      );

      notification.status = 'failed';
      // notification.error = (error as Error).message;
      await notification.save();
    }
  }

  private async cleanOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $in: ['sent', 'failed', 'canceled'] },
      });

      console.log(`🧹 Notificaciones limpiadas: ${result.deletedCount}`);
    } catch (error) {
      console.error('❌ Error en cleanOldNotifications:', error);
    }
  }

  // Método para detener manualmente el scheduler (opcional)
  public stop(): void {
    // node-cron no tiene un método stop directo, pero puedes guardar las tareas
    console.log('🛑 Notification scheduler stopped');
  }
}

export default NotificationScheduler;
