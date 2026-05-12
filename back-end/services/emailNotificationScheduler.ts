// services/medicalNotification.service.ts
import cron from 'node-cron';
import mongoose from 'mongoose';
import EmailService from './emailService';
import User from '../models/User.model';
import Pet from '../models/Pet.model';
import {
  IMedicalRecord,
  IPet,
  IVaccinesControl,
  IDewormingControl,
  IMedicalVisits
} from '../interfaces/Ipet';

interface MedicalEvent {
  type: 'vaccine' | 'deworming' | 'medical_visit';
  eventDate: Date;
  name: string;
  petId: mongoose.Types.ObjectId;
  petName: string;
  ownerEmail: string;
  ownerName: string;
  recordId: mongoose.Types.ObjectId;
  observations?: string;
  notificationDaysBefore: number;
}

class MedicalNotificationService {
  private emailService: EmailService;
  private static instance: MedicalNotificationService;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.init();
  }

  public static getInstance(): MedicalNotificationService {
    if (!MedicalNotificationService.instance) {
      MedicalNotificationService.instance = new MedicalNotificationService();
    }
    return MedicalNotificationService.instance;
  }

  private init(): void {
    // Ejecutar cada hora para verificar eventos médicos próximos
    cron.schedule('0 * * * *', this.checkUpcomingMedicalEvents.bind(this));
    console.log('✅ Medical Notification Service initialized');
  }

  private async checkUpcomingMedicalEvents(): Promise<void> {
    try {
      const now = new Date();

      // Buscar todas las mascotas con sus owners poblados
      const pets = await Pet.find()
        .populate('owner')
        .lean();

      console.log(`🔍 Verificando eventos médicos para ${pets.length} mascotas`);

      for (const pet of pets) {
        if (!pet.owner) {
          console.log(`⚠️ Mascota ${pet._id} no tiene owner asociado`);
          continue;
        }

        const user = pet.owner as any;
        if (!user?.email) {
          console.log(`⚠️ Owner de mascota ${pet._id} no tiene email`);
          continue;
        }

        await this.checkPetMedicalEvents(pet as IPet, user, now);
      }
    } catch (error) {
      console.error('❌ Error checking medical events:', error);
    }
  }

  private async checkPetMedicalEvents(
    pet: IPet,
    user: any,
    now: Date
  ): Promise<void> {
    const medicalRecords = pet.medicalRecord as IMedicalRecord;
    if (!medicalRecords) {
      console.log(`ℹ️ Mascota ${pet.petName} no tiene registro médico`);
      return;
    }

    console.log(`📋 Verificando registros de ${pet.petName}`);

    // Verificar Vacunas
    if (medicalRecords.vaccines && medicalRecords.vaccines.length > 0) {
      for (const vaccine of medicalRecords.vaccines) {
        if (!vaccine.emailNotificationEnabled || !vaccine.nextVaccineDate) continue;

        const nextDate = new Date(vaccine.nextVaccineDate);
        const daysUntilEvent = Math.ceil(
          (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );

        console.log(`💉 Vacuna ${vaccine.vaccineName}: ${daysUntilEvent} días restantes`);

        // Verificar si está en el rango de notificación
        if (daysUntilEvent <= vaccine.notificationDaysBefore && daysUntilEvent >= 0) {
          await this.sendNotificationIfNeeded({
            type: 'vaccine',
            eventDate: nextDate,
            name: vaccine.vaccineName || 'Vacuna',
            petId: pet._id,
            petName: pet.petName,
            ownerEmail: user.email,
            ownerName: user.name || user.email || 'Usuario',
            recordId: vaccine._id!,
            observations: vaccine.observations,
            notificationDaysBefore: vaccine.notificationDaysBefore,
          }, vaccine.lastNotificationSent);
        }
      }
    }

    // Verificar Desparasitaciones
    if (medicalRecords.deworming && medicalRecords.deworming.length > 0) {
      for (const deworming of medicalRecords.deworming) {
        if (!deworming.emailNotificationEnabled || !deworming.nextDewormingDate) continue;

        const nextDate = new Date(deworming.nextDewormingDate);
        const daysUntilEvent = Math.ceil(
          (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );

        console.log(`🐛 Desparasitante ${deworming.dewormerName}: ${daysUntilEvent} días restantes`);

        if (daysUntilEvent <= deworming.notificationDaysBefore && daysUntilEvent >= 0) {
          await this.sendNotificationIfNeeded({
            type: 'deworming',
            eventDate: nextDate,
            name: deworming.dewormerName || 'Desparasitante',
            petId: pet._id,
            petName: pet.petName,
            ownerEmail: user.email,
            ownerName: user.name || user.email || 'Usuario',
            recordId: deworming._id!,
            observations: deworming.observations,
            notificationDaysBefore: deworming.notificationDaysBefore,
          }, deworming.lastNotificationSent);
        }
      }
    }

    // Verificar Visitas Médicas
    if (medicalRecords.datesOfMedicalVisits && medicalRecords.datesOfMedicalVisits.length > 0) {
      for (const visit of medicalRecords.datesOfMedicalVisits) {
        if (!visit.emailNotificationEnabled || !visit.visitDate) continue;

        const visitDate = new Date(visit.visitDate);
        const daysUntilEvent = Math.ceil(
          (visitDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );

        console.log(`🏥 Visita médica (${this.getReasonLabel(visit.reasonForVisit)}): ${daysUntilEvent} días restantes`);

        if (daysUntilEvent <= visit.notificationDaysBefore && daysUntilEvent >= 0) {
          await this.sendNotificationIfNeeded({
            type: 'medical_visit',
            eventDate: visitDate,
            name: this.getReasonLabel(visit.reasonForVisit),
            petId: pet._id,
            petName: pet.petName,
            ownerEmail: user.email,
            ownerName: user.name || user.email || 'Usuario',
            recordId: visit._id!,
            observations: visit.observations,
            notificationDaysBefore: visit.notificationDaysBefore,
          }, visit.lastNotificationSent);
        }
      }
    }
  }

  private async sendNotificationIfNeeded(
    event: MedicalEvent,
    lastNotificationSent: Date | null
  ): Promise<void> {
    const shouldSend = !lastNotificationSent ||
      this.shouldResendNotification(new Date(lastNotificationSent), event.eventDate);

    if (!shouldSend) {
      console.log(`⏭️ Omitiendo notificación para ${event.type} - ya enviada recientemente`);
      return;
    }

    console.log(`📧 Enviando recordatorio para ${event.type}: ${event.name} a ${event.ownerEmail}`);

    const success = await this.sendMedicalReminderEmail(event);

    if (success) {
      console.log(`✅ Notificación enviada exitosamente para ${event.type}: ${event.name}`);
      await this.updateLastNotificationSent(event);
    } else {
      console.log(`❌ Falló el envío de notificación para ${event.type}: ${event.name}`);
    }
  }

  private shouldResendNotification(lastSent: Date, eventDate: Date): boolean {
    const now = new Date();
    const daysSinceLastNotification = Math.ceil(
      (now.getTime() - lastSent.getTime()) / (1000 * 3600 * 24)
    );
    const daysUntilEvent = Math.ceil(
      (eventDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
    );

    // Reenviar si pasaron 3 días y aún faltan al menos 1 día para el evento
    const shouldResend = daysSinceLastNotification >= 3 && daysUntilEvent >= 1;

    if (shouldResend) {
      console.log(`📨 Reenviando notificación - última vez hace ${daysSinceLastNotification} días, faltan ${daysUntilEvent} días`);
    }

    return shouldResend;
  }

  private async sendMedicalReminderEmail(event: MedicalEvent): Promise<boolean> {
    const daysUntilEvent = Math.ceil(
      (event.eventDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    );

    // Usar el nuevo método específico del EmailService
    return await this.emailService.sendMedicalReminderEmail(
      event.ownerEmail,
      {
        userName: event.ownerName,
        petName: event.petName,
        eventType: this.getEventTypeLabel(event.type),
        eventName: event.name,
        eventDate: event.eventDate.toLocaleDateString('es-CR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        daysUntilEvent: daysUntilEvent,
        urgencyLevel: this.getUrgencyLevel(daysUntilEvent),
        observations: event.observations || 'Sin observaciones adicionales',
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/pet/${event.petId}`,
        year: new Date().getFullYear(),
        companyName: 'PlaquitasCR',
        logoUrl: process.env.LOGO_URL || 'https://plaquitascr.com/assets/images/plaquitascr.png',
        phoneNumber: process.env.PHONE_NUMBER || '+50670160434',
        facebookUrl: process.env.FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=100064041162056',
        facebookUsername: process.env.FACEBOOK_USERNAME || '@PlaquitasCR',
        instagramUrl: process.env.INSTAGRAM_URL || 'https://www.instagram.com/plaquitas_cr',
        instagramUsername: process.env.INSTAGRAM_USERNAME || '@plaquitas_cr',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@plaquitascr.com',
      },
      'es'
    );
  }

  private async updateLastNotificationSent(event: MedicalEvent): Promise<void> {
    try {
      const Pet = mongoose.model('Pet');

      let updateQuery = {};
      switch (event.type) {
        case 'vaccine':
          updateQuery = {
            'medicalRecord.vaccines.$[elem].lastNotificationSent': new Date()
          };
          await Pet.updateOne(
            { _id: event.petId },
            { $set: updateQuery },
            {
              arrayFilters: [{ 'elem._id': event.recordId }]
            }
          );
          break;

        case 'deworming':
          updateQuery = {
            'medicalRecord.deworming.$[elem].lastNotificationSent': new Date()
          };
          await Pet.updateOne(
            { _id: event.petId },
            { $set: updateQuery },
            {
              arrayFilters: [{ 'elem._id': event.recordId }]
            }
          );
          break;

        case 'medical_visit':
          updateQuery = {
            'medicalRecord.datesOfMedicalVisits.$[elem].lastNotificationSent': new Date()
          };
          await Pet.updateOne(
            { _id: event.petId },
            { $set: updateQuery },
            {
              arrayFilters: [{ 'elem._id': event.recordId }]
            }
          );
          break;
      }

      console.log(`✅ Actualizado lastNotificationSent para ${event.type}: ${event.name}`);
    } catch (error) {
      console.error(`❌ Error actualizando lastNotificationSent:`, error);
    }
  }

  private getEventTypeLabel(type: string): string {
    const labels = {
      vaccine: 'Vacuna',
      deworming: 'Desparasitación',
      medical_visit: 'Cita Médica'
    };
    return labels[type as keyof typeof labels] || type;
  }

  private getReasonLabel(reason: string): string {
    const reasons: { [key: string]: string } = {
      annual_checkup: 'Chequeo anual',
      vaccination: 'Vacunación',
      deworming: 'Desparasitación',
      weight_control: 'Control de peso',
      digestive_issues: 'Problemas digestivos',
      skin_problems: 'Problemas de piel',
      injury_accident: 'Lesión o accidente',
      surgery: 'Cirugía',
      dental_care: 'Control dental',
      behavior: 'Comportamiento',
      other: 'Otro motivo'
    };
    return reasons[reason] || reason;
  }

  private getUrgencyLevel(daysUntilEvent: number): string {
    if (daysUntilEvent <= 1) return '⚠️ URGENTE';
    if (daysUntilEvent <= 3) return '🔴 Muy Próximo';
    if (daysUntilEvent <= 7) return '🟠 Próximo';
    return '🟡 Programado';
  }

  private getEmailSubject(event: MedicalEvent, daysUntilEvent: number): string {
    const prefix = daysUntilEvent <= 1 ? '⚠️ URGENTE - ' : '📅 Recordatorio - ';
    return `${prefix}${this.getEventTypeLabel(event.type)} de ${event.petName} - ${event.name}`;
  }

  // Método manual para forzar la verificación (útil para testing)
  public async forceCheck(): Promise<void> {
    console.log('🔧 Forzando verificación manual de eventos médicos...');
    await this.checkUpcomingMedicalEvents();
  }
}

export default MedicalNotificationService;