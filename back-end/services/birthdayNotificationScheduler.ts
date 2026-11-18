// services/birthdayNotificationScheduler.ts
import cron from 'node-cron';
import Pet from '../models/Pet.model';
import EmailService from './emailService';
import { calculateAge, getDaysUntilNextBirthday } from '../utils/dateUtils';

class BirthdayNotificationService {
  private emailService: EmailService;
  private static instance: BirthdayNotificationService;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.init();
  }

  public static getInstance(): BirthdayNotificationService {
    if (!BirthdayNotificationService.instance) {
      BirthdayNotificationService.instance =
        new BirthdayNotificationService();
    }
    return BirthdayNotificationService.instance;
  }

  private init(): void {
    // Diario a las 8:00 AM
    cron.schedule('0 8 * * *', this.checkBirthdays.bind(this));
    console.log('✅ Birthday Notification Service initialized');
  }

  private async checkBirthdays(): Promise<void> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();

      const pets = await Pet.find({
        birthdayEmailEnabled: true,
        birthDate: { $exists: true, $nin: [null, ''] },
        $or: [
          { birthdayEmailLastSentYear: null },
          { birthdayEmailLastSentYear: { $ne: currentYear } },
        ],
      })
        .populate('owner')
        .lean();

      for (const pet of pets) {
        const owner: any = (pet as any).owner;
        if (!owner?.email || !pet.birthDate) continue;

        const birthDate = new Date(pet.birthDate as string);
        if (isNaN(birthDate.getTime())) continue;

        const daysUntil = getDaysUntilNextBirthday(birthDate, now);
        if (daysUntil !== 0) continue;

        const age = calculateAge(birthDate, now);
        const sent = await this.emailService.sendPetBirthdayEmail(
          owner.email,
          {
            userName:
              owner?.profile?.name ||
              owner?.profile?.username ||
              owner?.email ||
              'Usuario',
            petName: (pet as any).petName || 'tu mascota',
            age,
          },
          'es'
        );

        if (sent) {
          await Pet.updateOne(
            { _id: (pet as any)._id },
            { $set: { birthdayEmailLastSentYear: currentYear } }
          );
          console.log(
            `🎂 Birthday email sent for ${(pet as any).petName} to ${owner.email}`
          );
        }
      }
    } catch (error) {
      console.error('❌ Error checking birthdays:', error);
    }
  }

  public async forceCheck(): Promise<void> {
    await this.checkBirthdays();
  }
}

export default BirthdayNotificationService;
