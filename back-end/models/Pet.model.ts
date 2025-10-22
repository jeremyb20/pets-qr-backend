import { Schema, model, Document, Types } from 'mongoose';

// Interfaces para los subdocumentos
interface IPetViewCounter {
  lat: string;
  lng: string;
  dateViewed: string;
  _id?: Types.ObjectId;
}

interface IPetStatusReport {
  lastPlaceLost: string;
  date: string;
  petStatus: string;
  descriptionLost: string;
  _id?: Types.ObjectId;
}

interface IPetPermissions {
  showPhoneInfo: boolean;
  showEmailInfo: boolean;
  showLinkTwitter: boolean;
  showLinkFacebook: boolean;
  showLinkInstagram: boolean;
  showOwnerPetName: boolean;
  showBirthDate: boolean;
  showAddressInfo: boolean;
  showAgeInfo: boolean;
  showVeterinarianContact: boolean;
  showPhoneVeterinarian: boolean;
  showHealthAndRequirements: boolean;
  showFavoriteActivities: boolean;
  showLocationInfo: boolean;
}

// Interface principal del documento Pet
export interface IPet extends Document {
  owner: Types.ObjectId;
  petName: string;
  genderSelected?: string;
  race?: string;
  weight?: string;
  petStatus: string;
  birthDate?: string;
  favoriteActivities?: string;
  healthAndRequirements?: string;
  phoneVeterinarian?: string;
  veterinarianContact?: string;
  photo?: string;
  photo_id?: string;
  address?: string;
  lat?: string;
  lng?: string;
  linkTwitter?: string;
  linkFacebook?: string;
  linkInstagram?: string;
  isDigitalIdentificationActive: boolean;
  petViewCounter: IPetViewCounter[];
  permissions: IPetPermissions;
  petStatusReport: IPetStatusReport[];
  createdAt: Date;
  updatedAt: Date;
  qrCode?: Types.ObjectId;
}

const PetSchema = new Schema<IPet>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    petName: {
      type: String,
      required: true,
    },
    genderSelected: {
      type: String,
      required: false,
    },
    race: {
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

// Método estático para buscar mascotas por dueño
PetSchema.statics.findByOwner = function (
  ownerId: Types.ObjectId
): Promise<IPet[]> {
  return this.find({ owner: ownerId }).sort({ createdAt: -1 }).exec();
};

// Método estático para buscar mascotas activas
PetSchema.statics.findActivePets = function (): Promise<IPet[]> {
  return this.find({ petStatus: 'active' }).populate('owner').exec();
};

// Método de instancia para marcar como perdida
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

// Método de instancia para marcar como encontrada
PetSchema.methods.markAsFound = function (): Promise<IPet> {
  this.petStatus = 'active';
  return this.save();
};

// Método de instancia para agregar vista
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

export default model<IPet>('Pet', PetSchema);
