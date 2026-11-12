import { Types } from 'mongoose';
import VeterinaryMember from '../models/VeterinaryMember.model';
import { IVeterinaryMember } from '../interfaces/IVeterinary';

export const getVeterinaryMembership = async (
  userId: string,
  veterinaryId: string
): Promise<IVeterinaryMember | null> => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(veterinaryId)) {
    return null;
  }

  return VeterinaryMember.findOne({
    userId,
    veterinaryId,
    isActive: true,
  });
};

export const isVeterinaryOwner = (membership: IVeterinaryMember | null): boolean =>
  membership?.memberRole === 'owner';

export const solvePetIdentifier = (identifier: string) =>
  Types.ObjectId.isValid(identifier)
    ? {
        $or: [{ _id: identifier }, { memberPetId: identifier }],
      }
    : { memberPetId: identifier };
