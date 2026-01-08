import { Router } from 'express';
import notificationCtl from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Suscribirse a notificaciones push
router.post('/subscribe', authenticateToken, notificationCtl.subscribe);

// Enviar notificación inmediata
router.post('/send', authenticateToken, notificationCtl.sendNotification);

// Programar notificación
router.post(
  '/schedule',
  authenticateToken,
  notificationCtl.scheduleNotification
);

// Obtener notificaciones del usuario
router.get(
  '/getNotifications',
  authenticateToken,
  notificationCtl.getUserNotifications
);

// Marcar notificación como leída
router.patch(
  '/:notificationId/read',
  authenticateToken,
  notificationCtl.markAsRead
);

// Eliminar notificación
router.delete(
  '/delete/:notificationId',
  authenticateToken,
  notificationCtl.deleteNotification
);

// unsubscribe de notificaciones push
router.post('/unsubscribe', authenticateToken, notificationCtl.unsubscribe);

// send test notification
router.post('/send', authenticateToken, notificationCtl.send);

export default router;
