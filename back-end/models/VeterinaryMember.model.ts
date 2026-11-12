import { Schema, model } from 'mongoose';
import { IVeterinaryMember } from '../interfaces/IVeterinary';

const VeterinaryMemberSchema = new Schema<IVeterinaryMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    veterinaryId: {
      type: Schema.Types.ObjectId,
      ref: 'Veterinary',
      required: true,
    },
    memberRole: {
      type: String,
      enum: ['owner', 'veterinarian', 'staff'],
      default: 'veterinarian',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

VeterinaryMemberSchema.index({ userId: 1, veterinaryId: 1 }, { unique: true });
VeterinaryMemberSchema.index({ veterinaryId: 1, memberRole: 1 });
VeterinaryMemberSchema.index({ userId: 1, isActive: 1 });

export default model<IVeterinaryMember>(
  'VeterinaryMember',
  VeterinaryMemberSchema
);
