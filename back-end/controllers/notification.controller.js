const Subscription = require('../models/subscription');
const Notification = require('../models/notifications');
const configureWebPush = require('../config/webpush');
const webpush = configureWebPush();

const notificationController = {
  // Guardar suscripción de usuario
  subscribe: async (req, res) => {
    try { 
      const subscription = req.body;
      const userId = req.user.id;  

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ 
          success: false, 
          message: 'Datos de suscripción inválidos' 
        });
      }

      // Verificar si ya existe la suscripción
      const existingSubscription = await Subscription.findOne({
        user: userId,
        endpoint: subscription.endpoint 
      });

      if (existingSubscription) {
        return res.status(200).json({ 
          success: true, 
          message: 'Suscripción ya existente' 
        });
      }

      // Crear nueva suscripción
      const newSubscription = new Subscription({
        user: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime || null
      });

      await newSubscription.save();

      res.status(201).json({ 
        success: true, 
        message: 'Suscripción guardada correctamente' 
      });
    } catch (error) {
      console.error('Error en subscribe:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  },

  // Enviar notificación inmediata
  sendNotification: async (req, res) => {
    try {
      const { title, body, type, data } = req.body;
      const userId = req.user.id;

      // Guardar en base de datos
      const notification = new Notification({
        user: userId,
        title,
        body,
        type,
        data,
        status: 'pending'
      });

      await notification.save();

      // Enviar notificación push
      await notificationController.sendPushNotification(userId, {
        title,
        body,
        data
      });

      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      res.status(200).json({ 
        success: true, 
        message: 'Notificación enviada correctamente',
        notification 
      });
    } catch (error) {
      console.error('Error en sendNotification:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  },

  // Programar notificación
  scheduleNotification: async (req, res) => {
    try {
      const { title, body, type, data, scheduledTime } = req.body;

      const userId = req.user.id;

      if (!scheduledTime || new Date(scheduledTime) <= new Date()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Fecha de programación inválida' 
        });
      }

      const notification = new Notification({
        user: userId,
        title,
        body,
        type,
        data,
        scheduledFor: new Date(scheduledTime),
        status: 'pending'
      });

      await notification.save();

      res.status(201).json({ 
        success: true, 
        message: 'Notificación programada correctamente',
        payload: notification 
      });
    } catch (error) {
      console.error('Error en scheduleNotification:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  },

  // Obtener notificaciones del usuario
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const query = { user: userId };
      if (unreadOnly === 'true') {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Notification.countDocuments(query);

      res.status(200).json({
        payload: notifications,
        success: true,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    } catch (error) {
      console.error('Error en getUserNotifications:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  },

  // Marcar notificación como leída
  markAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ 
          success: false, 
          message: 'Notificación no encontrada' 
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Notificación marcada como leída',
        notification 
      });
    } catch (error) {
      console.error('Error en markAsRead:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  },

  // Función interna para enviar push notifications
  sendPushNotification: async (userId, payload) => {
    try {
      const subscriptions = await Subscription.find({ 
        user: userId, 
        isActive: true 
      });

      const promises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            JSON.stringify(payload)
          );
          return { success: true, subscriptionId: subscription._id };
        } catch (error) {
          console.error('Error enviando notificación push:', error);
          
          // Si la suscripción es inválida, desactivarla
          if (error.statusCode === 410) {
            await Subscription.findByIdAndUpdate(
              subscription._id,
              { isActive: false }
            );
          }
          
          return { success: false, error: error.message };
        }
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Error en sendPushNotification:', error);
      throw error;
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Notificación eliminada correctamente'
      });
    } catch (error) {
      console.error('Error en deleteNotification:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

module.exports = notificationController;