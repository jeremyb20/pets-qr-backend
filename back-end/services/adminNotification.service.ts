// services/adminNotification.service.ts
import { Types } from 'mongoose';
import { notificationController } from '../controllers/notification.controller';
import Notification from '../models/Notifications.model';
import User from '../models/User.model';
import { IPet } from '../interfaces/Ipet';
import 'dotenv/config';
import { IUser } from '../interfaces/IUser';

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
      const body = `El usuario con el correo: ${userData?.email || 'N/A'} ha registrado a ${petData.petName} (${petData.breed || 'mascota'})`;

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
      const admins = await User.find({ role: 'admin', isActive: true });

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
              actionUrl: '/admin/pets/' + petData.petId,
            },
            targetDevices: ['all'],
          }
        );
      }
    } catch (error) {
      console.error('❌ Error notificando actualización de mascota:', error);
    }
  }
}
