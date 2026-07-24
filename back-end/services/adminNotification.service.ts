// services/adminNotification.service.ts
import { Types } from 'mongoose';
import { notificationController } from '../controllers/notification.controller';
import Notification from '../models/Notifications.model';
import User from '../models/User.model';
import { IPet } from '../interfaces/Ipet';
import 'dotenv/config';
import { IUser } from '../interfaces/IUser';
import { IPetTagOrder } from '../types/pet-tag.types';

export class AdminNotificationService {
  /**
   * Enviar notificación al admin cuando se registra una mascota
   */
  static async notifyNewPet(
    petData: IPet,
    userData: IUser | undefined
  ): Promise<void> {
    try {
      // Buscar todos los admins (puedes tener múltiples admins)
      const admins = await User.find({
        role: 0, // Asumiendo que tienes un campo 'role'
        userStatus: 3,
      });

      if (!admins.length) {
        console.log('No hay admins activos para notificar');
        return;
      }

      const title = '¡Nueva mascota registrada! 🐾';
      const body = `El usuario con el correo: ${userData?.email || 'N/A'} ha registrado una mascota con el nombre de: ${petData.petName}`;

      const notificationData = {
        type: 'pet_registration',
        memberPetId: petData.memberPetId.toString(),
        petName: petData.petName,
        owner: petData?.owner || '',
        ownerPetName: petData.ownerPetName,
        breed: petData.breed,
        timestamp: new Date().toISOString(),
        actionUrl: '/pet/' + petData.memberPetId, // URL para ver la mascota
      };

      // Enviar notificación a cada admin
      for (const admin of admins) {
        await notificationController.sendPushNotification(
          admin._id as Types.ObjectId,
          {
            title,
            body,
            type: 'alert',
            data: notificationData,
            icon: admin.profile.photoProfile || process.env.LOGO_URL,
            targetDevices: ['all'], // Enviar a todos los dispositivos del admin
            image: petData.photo,
          }
        );

        // Guardar en base de datos
        const notification = new Notification({
          user: admin._id,
          title: title.trim(),
          body: body.trim(),
          type: 'alert',
          data: notificationData,
          status: 'sent',
          sentAt: new Date(),
          icon: admin.profile.photoProfile || process.env.LOGO_URL,
          image: petData.photo,
        });

        await notification.save();
      }

      console.log(`Notificación enviada a ${admins.length} admin(s)`);
    } catch (error) {
      console.error('❌ Error enviando notificación de nueva mascota:', error);
      // No lanzamos el error para no interrumpir el flujo principal
    }
  }

  /**
   * Enviar notificación al admin cuando se registra un NUEVO USUARIO
   */

  static async notifyNewUser(userData: IUser): Promise<void> {
    try {
      const admins = await User.find({
        role: 0,
        userStatus: 3,
      });

      if (!admins.length) return;

      const title = 'Nuevo registro de usuario 👤';
      const body = `Se ha registrado un nuevo usuario: ${userData.email}`;
      const notificationData = {
        type: 'pet_registration',
        name: userData.profile.name,
        email: userData.email,
        memberId: userData.memberId,

        timestamp: new Date().toISOString(),
        actionUrl: '/dashboard/admin/users/', // URL para ver la mascota
      };
      for (const admin of admins) {
        await notificationController.sendPushNotification(
          admin._id as Types.ObjectId,
          {
            title,
            body,
            type: 'alert',
            data: notificationData,
            icon: admin.profile.photoProfile || process.env.LOGO_URL,
            targetDevices: ['all'], // Enviar a todos los dispositivos del admin
            image: process.env.LOGO_URL,
          }
        );

        // Guardar en base de datos
        const notification = new Notification({
          user: admin._id,
          title: title.trim(),
          body: body.trim(),
          type: 'alert',
          data: notificationData,
          status: 'sent',
          sentAt: new Date(),
          icon: admin.profile.photoProfile || process.env.LOGO_URL,
          image: process.env.LOGO_URL,
        });

        await notification.save();
      }
    } catch (error) {
      console.error('❌ Error notificando nuevo usuario:', error);
    }
  }

  /**
   * Notificar cuando una mascota es actualizada
   */
  static async notifyPetUpdated(petData: {
    name: string;
    ownerName: string;
    ownerId: Types.ObjectId;
    petId: Types.ObjectId;
    changes: string[];
  }): Promise<void> {
    try {
      const admins = await User.find({ role: 0, userStatus: 3 });

      if (!admins.length) return;

      const title = 'Mascota actualizada 📝';
      const body = `${petData.ownerName} actualizó la información de ${petData.name}`;

      for (const admin of admins) {
        await notificationController.sendPushNotification(
          admin._id as Types.ObjectId,
          {
            title,
            body,
            type: 'system',
            data: {
              type: 'pet_updated',
              petId: petData.petId.toString(),
              petName: petData.name,
              ownerId: petData.ownerId.toString(),
              ownerName: petData.ownerName,
              changes: petData.changes,
              actionUrl: '/dashboard/admin/users',
            },
            targetDevices: ['all'],
          }
        );
      }
    } catch (error) {
      console.error('❌ Error notificando actualización de mascota:', error);
    }
  }
  /**
   * Enviar notificación al admin cuando se recibe un nuevo feedback
   */
  static async notifyNewPetTagOrder(orderData: IPetTagOrder): Promise<void> {
    try {
      const admins = await User.find({ role: 0, userStatus: 3 });
      if (!admins.length) return;

      const title = '¡Nueva orden de pet tag! 🏷️';
      const body = `${orderData.contactName} (${orderData.contactPhone}) ordenó un tag ${orderData.shape} de ${orderData.material} - Talla: ${orderData.size}`;
      const notificationData = {
        type: 'pet_tag_order',
        contactName: orderData.contactName,
        contactPhone: orderData.contactPhone,
        shape: orderData.shape,
        material: orderData.material,
        size: orderData.size,
        petType: orderData.petType,
        timestamp: new Date().toISOString(),
        actionUrl: '/dashboard/admin/pet-tags',
      };

      for (const admin of admins) {
        await notificationController.sendPushNotification(
          admin._id as Types.ObjectId,
          {
            title,
            body,
            type: 'alert',
            data: notificationData,
            icon: admin.profile.photoProfile || process.env.LOGO_URL,
            targetDevices: ['all'],
            image: process.env.LOGO_URL,
          }
        );

        const notification = new Notification({
          user: admin._id,
          title: title.trim(),
          body: body.trim(),
          type: 'alert',
          data: notificationData,
          status: 'sent',
          sentAt: new Date(),
          icon: admin.profile.photoProfile || process.env.LOGO_URL,
          image: process.env.LOGO_URL,
        });

        await notification.save();
      }
    } catch (error) {
      console.error('❌ Error notificando nueva orden de pet tag:', error);
    }
  }

  static async notifyNewFeedback(feedbackData: any): Promise<void> {
    try {
      // Obtener administradores (role: 0, userStatus: 3 = activo)
      const admins = await User.find({
        role: 0,
        userStatus: 3,
      });

      if (!admins.length) {
        console.log('ℹ️ No admins found to notify about feedback');
        return;
      }

      // Determinar emoji y color según el tipo de feedback
      const feedbackTypeMap = {
        bug: {
          emoji: '🐛',
          color: '#DC3545',
          title: '🐛 Nuevo Bug Reportado',
          priority: 'critical',
        },
        improvement: {
          emoji: '💡',
          color: '#FFC107',
          title: '💡 Nueva Sugerencia de Mejora',
          priority: 'high',
        },
        suggestion: {
          emoji: '📝',
          color: '#17A2B8',
          title: '📝 Nueva Sugerencia',
          priority: 'medium',
        },
        question: {
          emoji: '❓',
          color: '#6C757D',
          title: '❓ Nueva Pregunta',
          priority: 'low',
        },
      };

      const typeInfo =
        feedbackTypeMap[feedbackData.type as keyof typeof feedbackTypeMap] ||
        feedbackTypeMap.suggestion;

      // Construir título y mensaje según el tipo
      const title = typeInfo.title;
      const body = `${feedbackData.user?.name || 'Usuario anónimo'} reportó: "${feedbackData.title}"`;

      // Construir datos para la notificación
      const notificationData = {
        type: 'feedback',
        feedbackId: feedbackData._id,
        feedbackType: feedbackData.type,
        title: feedbackData.title,
        description: feedbackData.description,
        priority: feedbackData.priority,
        category: feedbackData.category,
        user: {
          id: feedbackData.user?.id,
          name: feedbackData.user?.name || 'Anonymous',
          email: feedbackData.user?.email || 'No email',
          phone: feedbackData.user?.phone,
        },
        metadata: {
          url: feedbackData.metadata?.url,
          userAgent: feedbackData.metadata?.userAgent,
          screenSize: feedbackData.metadata?.screenSize,
        },
        timestamp: feedbackData.createdAt || new Date().toISOString(),
        actionUrl: '/dashboard/admin/feedback', // URL para ver todos los feedbacks
      };

      // Enviar notificación a cada administrador
      for (const admin of admins) {
        try {
          // Enviar push notification
          await notificationController.sendPushNotification(
            admin._id as Types.ObjectId,

            {
              title,
              body,
              type: 'system',
              data: notificationData,
              targetDevices: ['all'],
            }
          );

          // Guardar en base de datos
          const notification = new Notification({
            user: admin._id,
            title: title.trim(),
            body: body.trim(),
            type: 'system',
            data: notificationData,
            status: 'sent',
            sentAt: new Date(),
            icon: admin.profile.photoProfile || process.env.LOGO_URL,
            image: process.env.LOGO_URL,
            priority: feedbackData.priority || 'medium',
            category: feedbackData.category || 'Other',
          });

          await notification.save();

          console.log(`✅ Feedback notification sent to admin: ${admin.email}`);
        } catch (adminError) {
          console.error(`❌ Error notifying admin ${admin.email}:`, adminError);
        }
      }

      console.log(`✅ Feedback notifications sent to ${admins.length} admins`);
    } catch (error) {
      console.error('❌ Error sending feedback notifications:', error);
    }
  }
}
