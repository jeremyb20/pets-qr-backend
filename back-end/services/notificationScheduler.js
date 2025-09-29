const cron = require('node-cron');
const Notification = require('../models/notifications');
const notificationController = require('../controllers/notification.controller');

class NotificationScheduler {
  constructor() {
    this.init();
  }

  init() {
    // Ejecutar cada minuto para verificar notificaciones pendientes
    cron.schedule('* * * * *', this.checkScheduledNotifications.bind(this));
    
    // Limpieza diaria de notificaciones antiguas
    cron.schedule('0 0 * * *', this.cleanOldNotifications.bind(this));
    
    console.log('Notification scheduler initialized');
  }

  async checkScheduledNotifications() {
    try {
      const now = new Date();
      const notifications = await Notification.find({
        scheduledFor: { $lte: now },
        status: 'pending'
      }).populate('user');

      for (const notification of notifications) {
        try {
          await notificationController.sendPushNotification(notification.user._id, {
            title: notification.title,
            body: notification.body,
            data: notification.data
          });

          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();

          console.log(`Notificación enviada: ${notification._id}`);
        } catch (error) {
          console.error(`Error enviando notificación ${notification._id}:`, error);
          notification.status = 'failed';
          await notification.save();
        }
      }
    } catch (error) {
      console.error('Error en checkScheduledNotifications:', error);
    }
  }

  async cleanOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $in: ['sent', 'failed', 'canceled'] }
      });

      console.log(`Notificaciones limpiadas: ${result.deletedCount}`);
    } catch (error) {
      console.error('Error en cleanOldNotifications:', error);
    }
  }
}

module.exports = NotificationScheduler;