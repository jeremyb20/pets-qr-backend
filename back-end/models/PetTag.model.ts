import {
  IPersonalization,
  IPetTagOrder,
  IPosition,
  ITagSide,
} from '../types/pet-tag.types';
import mongoose, { Schema } from 'mongoose';

const PositionSchema = new Schema<IPosition>({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
});

const PersonalizationSchema: Schema<IPersonalization> =
  new Schema<IPersonalization>({
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    fontSize: { type: Number, default: 36 },
    nameFontSize: { type: Number, default: 36 },
    phoneFontSize: { type: Number, default: 24 },
    fontColor: { type: String, default: '#ffffff' },
    strokeColor: { type: String, default: '#000000' },
    strokeWidth: { type: Number, default: 3 },
    strokePosition: { type: String, default: 'outside' },
    fontFamily: { type: String, default: 'Comic Sans MS' },
    doubleSided: { type: Boolean, default: false },
    moldScale: { type: Number, default: 2 },
    moldPosition: { type: PositionSchema, required: true },
    namePosition: { type: PositionSchema, required: true },
    phonePosition: { type: PositionSchema, required: true },
  });

const ImageSchema = new Schema({
  imageURL: { type: String },
  imageID: { type: String },
});

const TagSideSchema = new Schema<ITagSide>({
  image: { type: ImageSchema },
  personalization: { type: PersonalizationSchema },
  background: { type: String },
});

const PetTagOrderSchema = new Schema<IPetTagOrder>(
  {
    shape: { type: String, required: true },
    material: { type: String, required: true },
    size: { type: String, required: true },
    petType: { type: String, required: true },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactNote: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'in-process', 'rejected', 'completed'],
      default: 'pending',
    },
    front: { type: TagSideSchema },
    back: { type: TagSideSchema },
  },
  { timestamps: true }
);

export const PetTagOrder = mongoose.model<IPetTagOrder>(
  'PetTagOrder',
  PetTagOrderSchema
);
