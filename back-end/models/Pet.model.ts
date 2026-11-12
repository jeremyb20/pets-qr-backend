import {
  IDewormingControl,
  IEmergencyContact,
  IMedicalRecord,
  IMedicalVisits,
  IPet,
  IPetStatusReport,
  IPetViewCounter,
  IVaccinesControl,
} from '../interfaces/Ipet';
import { Schema, model, Document, Types } from 'mongoose';

export const DefaultPermissions = {
  showPhoneInfo: true, // Muestra teléfono del dueño
  showOwnerPetName: true, // Muestra nombre del dueño de la mascota
  showEmailInfo: true, // Muestra email del dueño
  showBirthDate: true, // Muestra fecha de nacimiento de la mascota
  showAddressInfo: true, // Muestra dirección del dueño
  showAgeInfo: true, // Muestra la edad calculada de la mascota
  showVeterinarianContact: true, // Muestra contacto del veterinario
  showPhoneVeterinarian: true, // Muestra teléfono del veterinario
  showHealthAndRequirements: true, // Muestra información de salud
  showFavoriteActivities: true, // Muestra actividades favoritas
  showLocationInfo: true, // Muestra ubicación (lat/lng)
  showLocationConsent: false, // Consentimiento de ubicación
  showNotes: false, // Muestra notas internas del dueño
  showBreedInfo: true, // Muestra información de raza
  showWeightInfo: true, // Muestra información de peso
  showGenderInfo: true, // Muestra información de género
  showClinicalRecord: false, // Muestra historial clínico veterinario
  showAllergies: false, // Muestra alergias de la mascota
  showMedications: false, // Muestra medicamentos de la mascota
  showEmergencyContacts: false, // Muestra contactos de emergencia
};

// models/MedicalRecord.model.ts (actualización)
const VaccineSchema = new Schema<IVaccinesControl>({
  dateOfApplication: {
    type: String,
    required: false,
  },
  nextVaccineDate: {
    type: String,
    required: false,
  },
  vaccineName: {
    type: String,
    required: false,
  },
  observations: {
    type: String,
    required: false,
  },
  emailNotificationEnabled: {
    type: Boolean,
    default: false,
  },
  lastNotificationSent: {
    type: Date,
    default: null,
  },
  notificationDaysBefore: {
    type: Number,
    default: 7,
  },
});

const DewormingSchema = new Schema<IDewormingControl>({
  dateOfApplication: {
    type: String,
    required: false,
  },
  nextDewormingDate: {
    type: String,
    required: false,
  },
  dewormerName: {
    type: String,
    required: false,
  },
  observations: {
    type: String,
    required: false,
  },
  emailNotificationEnabled: {
    type: Boolean,
    default: false,
  },
  lastNotificationSent: {
    type: Date,
    default: null,
  },
  notificationDaysBefore: {
    type: Number,
    default: 7,
  },
});

const DatesOfMedicalVisitsSchema = new Schema<IMedicalVisits>({
  visitDate: {
    type: String,
    required: false,
  },
  reasonForVisit: {
    type: String,
    required: false,
  },
  veterinarianName: {
    type: String,
    required: false,
  },
  observations: {
    type: String,
    required: false,
  },
  emailNotificationEnabled: {
    type: Boolean,
    default: false,
  },
  lastNotificationSent: {
    type: Date,
    default: null,
  },
  notificationDaysBefore: {
    type: Number,
    default: 7,
  },
});

const MedicalRecordSchema = new Schema<IMedicalRecord>({
  vaccines: [
    {
      type: VaccineSchema,
      default: [],
    },
  ],
  deworming: [
    {
      type: DewormingSchema,
      default: [],
    },
  ],
  datesOfMedicalVisits: [
    {
      type: DatesOfMedicalVisitsSchema,
      default: [],
    },
  ],
});

const EmergencyContactSchema = new Schema<IEmergencyContact>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  relationship: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
});

const PetSchema = new Schema<IPet>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberPetId: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    ownerPetName: {
      type: String,
      required: false,
    },
    petName: {
      type: String,
      required: true,
    },
    petFirstSurname: {
      type: String,
      required: false,
    },
    petSecondSurname: {
      type: String,
      required: false,
    },
    genderSelected: {
      type: String,
      required: false,
    },
    breed: {
      type: String,
      required: false,
    },
    weight: {
      type: String,
      required: false,
    },
    petStatus: {
      type: String,
      default: 'active',
    },
    birthDate: {
      type: String,
      required: false,
    },
    favoriteActivities: {
      type: String,
      required: false,
    },
    healthAndRequirements: {
      type: String,
      required: false,
    },
    phoneVeterinarian: {
      type: String,
      required: false,
    },
    veterinarianContact: {
      type: String,
      required: false,
    },
    photo: {
      type: String,
      required: false,
    },
    photo_id: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    lat: {
      type: String,
      required: false,
    },
    lng: {
      type: String,
      required: false,
    },
    isDigitalIdentificationActive: {
      type: Boolean,
      default: false,
    },
    petViewCounter: [
      {
        lat: String,
        lng: String,
        dateViewed: String,
      },
    ],
    permissions: {
      showPhoneInfo: {
        type: Boolean,
        default: true,
      },
      showEmailInfo: {
        type: Boolean,
        default: true,
      },
      showOwnerPetName: {
        type: Boolean,
        default: true,
      },
      showBirthDate: {
        type: Boolean,
        default: true,
      },
      showAddressInfo: {
        type: Boolean,
        default: true,
      },
      showAgeInfo: {
        type: Boolean,
        default: true,
      },
      showNotes: {
        type: Boolean,
        default: false,
      },
      showVeterinarianContact: {
        type: Boolean,
        default: true,
      },
      showPhoneVeterinarian: {
        type: Boolean,
        default: true,
      },
      showHealthAndRequirements: {
        type: Boolean,
        default: true,
      },
      showFavoriteActivities: {
        type: Boolean,
        default: true,
      },
      showLocationInfo: {
        type: Boolean,
        default: true,
      },
      showLocationConsent: {
        type: Boolean,
        default: true,
      },
      showBreedInfo: {
        type: Boolean,
        default: true,
      },
      showWeightInfo: {
        type: Boolean,
        default: true,
      },
      showGenderInfo: {
        type: Boolean,
        default: true,
      },
      showClinicalRecord: {
        type: Boolean,
        default: false,
      },
      showAllergies: {
        type: Boolean,
        default: false,
      },
      showMedications: {
        type: Boolean,
        default: false,
      },
      showEmergencyContacts: {
        type: Boolean,
        default: false,
      },
    },
    petStatusReport: {
      lostDate: {
        type: String,
        default: '',
      },
      lastSeenLocation: {
        type: String,
        default: '',
      },
      lostDescription: {
        type: String,
        default: '',
      },
      rewardAmount: {
        type: String,
        default: '',
      },
      isMicrochipped: {
        type: Boolean,
        default: false,
      },
      microchipNumber: {
        type: String,
        default: '',
      },
    },
    qrCode: {
      type: Schema.Types.ObjectId,
      ref: 'QrCode',
      default: null,
    },
    medicalRecord: {
      type: MedicalRecordSchema,
      default: () => ({
        vaccines: [],
        deworming: [],
        datesOfMedicalVisits: [],
      }),
    },
    notes: {
      type: String,
      required: false,
    },
    veterinaryId: {
      type: Schema.Types.ObjectId,
      ref: 'Veterinary',
      default: null,
    },
    registeredByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    emergencyContacts: {
      type: [EmergencyContactSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Índices
PetSchema.index({ owner: 1 });
PetSchema.index({ petStatus: 1 });
PetSchema.index({ isDigitalIdentificationActive: 1 });
PetSchema.index({ 'petViewCounter.dateViewed': -1 });
PetSchema.index({ veterinaryId: 1 });
PetSchema.index({ registeredByUserId: 1 });

// Métodos estáticos para el modelo
PetSchema.statics.findByOwner = function (
  ownerId: Types.ObjectId
): Promise<IPet[]> {
  return this.find({ owner: ownerId }).sort({ createdAt: -1 }).exec();
};

PetSchema.statics.findActivePets = function (): Promise<IPet[]> {
  return this.find({ petStatus: 'active' }).populate('owner').exec();
};

PetSchema.methods.markAsFound = function (): Promise<IPet> {
  this.petStatus = 'active';
  return this.save();
};

PetSchema.methods.addView = function (location: {
  lat: string;
  lng: string;
}): Promise<IPet> {
  const view: IPetViewCounter = {
    lat: location.lat,
    lng: location.lng,
    dateViewed: new Date().toISOString(),
  };

  this.petViewCounter.push(view);
  return this.save();
};

// Métodos para manejar el registro médico
PetSchema.methods.addVaccine = function (
  vaccineData: IVaccinesControl
): Promise<IPet> {
  this.medicalRecord.vaccines.push(vaccineData);
  return this.save();
};

PetSchema.methods.addDeworming = function (
  dewormingData: IDewormingControl
): Promise<IPet> {
  this.medicalRecord.deworming.push(dewormingData);
  return this.save();
};

PetSchema.methods.addMedicalVisit = function (
  visitData: IMedicalVisits
): Promise<IPet> {
  this.medicalRecord.datesOfMedicalVisits.push(visitData);
  return this.save();
};

// Métodos para obtener registros médicos ordenados
PetSchema.methods.getVaccinesByDate = function (): IVaccinesControl[] {
  return this.medicalRecord.vaccines.sort(
    (
      a: { dateOfApplication: string | number | Date },
      b: { dateOfApplication: string | number | Date }
    ) =>
      new Date(b.dateOfApplication).getTime() -
      new Date(a.dateOfApplication).getTime()
  );
};

PetSchema.methods.getDewormingByDate = function (): IDewormingControl[] {
  return this.medicalRecord.deworming.sort(
    (
      a: { dateOfApplication: string | number | Date },
      b: { dateOfApplication: string | number | Date }
    ) =>
      new Date(b.dateOfApplication).getTime() -
      new Date(a.dateOfApplication).getTime()
  );
};

PetSchema.methods.getMedicalVisitsByDate = function (): IMedicalVisits[] {
  return this.medicalRecord.datesOfMedicalVisits.sort(
    (
      a: { visitDate: string | number | Date },
      b: { visitDate: string | number | Date }
    ) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  );
};

export default model<IPet>('Pet', PetSchema);
