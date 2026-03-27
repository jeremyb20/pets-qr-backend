import { Types } from 'mongoose';

// Interfaces para los subdocumentos
export interface IPetViewCounter {
  lat: string;
  lng: string;
  dateViewed: string;
  _id?: Types.ObjectId;
}

export interface IPetStatusReport {
  lastPlaceLost: string;
  date: string;
  petStatus: string;
  descriptionLost: string;
  _id?: Types.ObjectId;
}

export interface IPetPermissions {
  showPhoneInfo: boolean;
  showEmailInfo: boolean;
  showOwnerPetName: boolean;
  showBirthDate: boolean;
  showAddressInfo: boolean;
  showVeterinarianContact: boolean;
  showPhoneVeterinarian: boolean;
  showHealthAndRequirements: boolean;
  showFavoriteActivities: boolean;
  showLocationInfo: boolean;
  showNotes: boolean;
  showLocationConsent: boolean;
}

export interface IVaccinesControl {
  dateOfApplication: string;
  nextVaccineDate: string;
  vaccineName: string;
  observations: string;
  _id?: Types.ObjectId;
}

export interface IDewormingControl {
  dateOfApplication: string;
  nextDewormingDate: string;
  dewormerName: string;
  observations: string;
  _id?: Types.ObjectId;
}

export interface IMedicalVisits {
  visitDate: string;
  reasonForVisit: string;
  veterinarianName: string;
  observations: string;
  _id?: Types.ObjectId;
}

export interface IMedicalRecord {
  vaccines: IVaccinesControl[]; // ← Array para historial de vacunas
  deworming: IDewormingControl[]; // ← Array para historial de desparasitación
  datesOfMedicalVisits: IMedicalVisits[]; // ← Array para historial de visitas médicas
}

// Interface principal del documento Pet
export interface IPet {
  owner: Types.ObjectId;
  memberPetId: string;
  petName: string;
  petFirstSurname?: string;
  petSecondSurname?: string;
  genderSelected?: string;
  breed?: string;
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
  phone: string;
  ownerPetName: string;
  medicalRecord?: IMedicalRecord; // ← Objeto con tres arrays
  notes: string;
}

export interface AddPetToExistingUserRequest {
  code: string;
  userCredentials: {
    email: string;
    password: string;
  };
  petData: {
    petName: string;
    breed: string;
    genderSelected: string;
    birthDate?: string;
    weight?: string;
    favoriteActivities?: string;
    healthAndRequirements?: string;
  };
}
