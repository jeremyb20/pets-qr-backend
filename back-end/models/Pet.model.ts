import {
  IDewormingControl,
  IMedicalRecord,
  IMedicalVisits,
  IPet,
  IPetStatusReport,
  IPetViewCounter,
  IVaccinesControl,
} from '../interfaces/Ipet';
import { Schema, model, Document, Types } from 'mongoose';

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
    linkTwitter: String,
    linkFacebook: String,
    linkInstagram: String,
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
      showPhoneInfo: { type: Boolean, default: true },
      showEmailInfo: { type: Boolean, default: true },
      showLinkTwitter: { type: Boolean, default: true },
      showLinkFacebook: { type: Boolean, default: true },
      showLinkInstagram: { type: Boolean, default: true },
      showOwnerPetName: { type: Boolean, default: true },
      showBirthDate: { type: Boolean, default: true },
      showAddressInfo: { type: Boolean, default: true },
      showAgeInfo: { type: Boolean, default: true },
      showVeterinarianContact: { type: Boolean, default: true },
      showPhoneVeterinarian: { type: Boolean, default: true },
      showHealthAndRequirements: { type: Boolean, default: true },
      showFavoriteActivities: { type: Boolean, default: true },
      showLocationInfo: { type: Boolean, default: true },
    },
    petStatusReport: [
      {
        lastPlaceLost: String,
        date: String,
        petStatus: String,
        descriptionLost: String,
      },
    ],
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

// Métodos estáticos para el modelo
PetSchema.statics.findByOwner = function (
  ownerId: Types.ObjectId
): Promise<IPet[]> {
  return this.find({ owner: ownerId }).sort({ createdAt: -1 }).exec();
};

PetSchema.statics.findActivePets = function (): Promise<IPet[]> {
  return this.find({ petStatus: 'active' }).populate('owner').exec();
};

// Métodos de instancia para la mascota
PetSchema.methods.markAsLost = function (lostData: {
  lastPlaceLost: string;
  descriptionLost: string;
}): Promise<IPet> {
  const report: IPetStatusReport = {
    lastPlaceLost: lostData.lastPlaceLost,
    descriptionLost: lostData.descriptionLost,
    date: new Date().toISOString(),
    petStatus: 'lost',
  };

  this.petStatus = 'lost';
  this.petStatusReport.push(report);

  return this.save();
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
