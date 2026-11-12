import { Document, Types } from 'mongoose';

export type VeterinaryMemberRole = 'owner' | 'veterinarian' | 'staff';

export interface IVeterinary extends Document {
  _id: Types.ObjectId;
  name: string;
  legalName?: string;
  licenseNumber?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVeterinaryMember extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  veterinaryId: Types.ObjectId;
  memberRole: VeterinaryMemberRole;
  isActive: boolean;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe';
export type DiseaseStatus = 'active' | 'resolved' | 'chronic';

interface ClinicalEntryBase {
  _id?: Types.ObjectId;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IConsultation extends ClinicalEntryBase {
  date: Date;
  reason: string;
  diagnosis?: string;
  treatment?: string;
  weight?: string;
  temperature?: string;
  veterinarianName?: string;
}

export interface IAllergy extends ClinicalEntryBase {
  name: string;
  severity?: AllergySeverity;
  reaction?: string;
  diagnosedAt?: Date;
}

export interface IDisease extends ClinicalEntryBase {
  name: string;
  status?: DiseaseStatus;
  diagnosedAt?: Date;
}

export interface IMedication extends ClinicalEntryBase {
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: Date;
  endDate?: Date;
  prescribedBy?: string;
}

export interface ITreatment extends ClinicalEntryBase {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ISurgery extends ClinicalEntryBase {
  name: string;
  date?: Date;
  veterinarianName?: string;
}

export interface IClinicalRecord extends Document {
  _id: Types.ObjectId;
  petId: Types.ObjectId;
  veterinaryId: Types.ObjectId;
  consultations: IConsultation[];
  allergies: IAllergy[];
  diseases: IDisease[];
  medications: IMedication[];
  treatments: ITreatment[];
  surgeries: ISurgery[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ClinicalRecordSection =
  | 'consultations'
  | 'allergies'
  | 'diseases'
  | 'medications'
  | 'treatments'
  | 'surgeries';
