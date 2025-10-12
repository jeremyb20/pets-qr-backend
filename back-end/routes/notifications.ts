// const { Router } = require('express');
// const router = Router();
// const notificationCtl = require('../controllers/notification.controller');

// const verification = require('../middleware/config')

// // Suscribirse a notificaciones push
// router.post('/subscribe', verification, notificationCtl.subscribe);

// // Enviar notificación inmediata
// router.post('/send', verification, notificationCtl.sendNotification);

// // Programar notificación
// router.post('/schedule',verification, notificationCtl.scheduleNotification);

// // Obtener notificaciones del usuario
// router.get('/getNotifications', verification, notificationCtl.getUserNotifications);

// // Marcar notificación como leída
// router.patch('/:notificationId/read', verification, notificationCtl.markAsRead);

// // eliminar notificación
// router.delete('/delete/:notificationId', verification, notificationCtl.deleteNotification);

// module.exports = router;
import { Router } from 'express';
import notificationCtl from '../controllers/notification.controller';
import verification from '../middleware/config';

const router = Router();

// Suscribirse a notificaciones push
router.post('/subscribe', verification, notificationCtl.subscribe);

// Enviar notificación inmediata
router.post('/send', verification, notificationCtl.sendNotification);

// Programar notificación
router.post('/schedule', verification, notificationCtl.scheduleNotification);

// Obtener notificaciones del usuario
router.get(
  '/getNotifications',
  verification,
  notificationCtl.getUserNotifications
);

// Marcar notificación como leída
router.patch('/:notificationId/read', verification, notificationCtl.markAsRead);

// Eliminar notificación
router.delete(
  '/delete/:notificationId',
  verification,
  notificationCtl.deleteNotification
);

export default router;
