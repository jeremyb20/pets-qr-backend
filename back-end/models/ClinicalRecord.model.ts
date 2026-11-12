import { Schema, model } from 'mongoose';
import {
  IAllergy,
  IClinicalRecord,
  IConsultation,
  IDisease,
  IMedication,
  ISurgery,
  ITreatment,
} from '../interfaces/IVeterinary';

const ConsultationSchema = new Schema<IConsultation>({
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  diagnosis: {
    type: String,
    trim: true,
  },
  treatment: {
    type: String,
    trim: true,
  },
  weight: {
    type: String,
    trim: true,
  },
  temperature: {
    type: String,
    trim: true,
  },
  veterinarianName: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const AllergySchema = new Schema<IAllergy>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  severity: {
    type: String,
    enum: ['mild', 'moderate', 'severe'],
  },
  reaction: {
    type: String,
    trim: true,
  },
  diagnosedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const DiseaseSchema = new Schema<IDisease>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'chronic'],
    default: 'active',
  },
  diagnosedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MedicationSchema = new Schema<IMedication>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  dosage: {
    type: String,
    trim: true,
  },
  frequency: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  prescribedBy: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TreatmentSchema = new Schema<ITreatment>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SurgerySchema = new Schema<ISurgery>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
  },
  veterinarianName: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ClinicalRecordSchema = new Schema<IClinicalRecord>(
  {
    petId: {
      type: Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
    },
    veterinaryId: {
      type: Schema.Types.ObjectId,
      ref: 'Veterinary',
      required: true,
    },
    consultations: {
      type: [ConsultationSchema],
      default: [],
    },
    allergies: {
      type: [AllergySchema],
      default: [],
    },
    diseases: {
      type: [DiseaseSchema],
      default: [],
    },
    medications: {
      type: [MedicationSchema],
      default: [],
    },
    treatments: {
      type: [TreatmentSchema],
      default: [],
    },
    surgeries: {
      type: [SurgerySchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ClinicalRecordSchema.index({ petId: 1, veterinaryId: 1 }, { unique: true });
ClinicalRecordSchema.index({ veterinaryId: 1 });
ClinicalRecordSchema.index({ petId: 1 });

export default model<IClinicalRecord>('ClinicalRecord', ClinicalRecordSchema);
