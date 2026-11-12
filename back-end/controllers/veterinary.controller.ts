import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Pet from '../models/Pet.model';
import User from '../models/User.model';
import Veterinary from '../models/Veterinary.model';
import VeterinaryMember from '../models/VeterinaryMember.model';
import ClinicalRecord from '../models/ClinicalRecord.model';
import {
  ClinicalRecordSection,
  VeterinaryMemberRole,
} from '../interfaces/IVeterinary';
import { ROLES } from '../middlewares/authMiddleware';
import { validatePasswordStrength } from '../utils/validate-password';
import { createManagedUser } from '../utils/create-account';
import {
  getVeterinaryMembership,
  isVeterinaryOwner,
  solvePetIdentifier,
} from '../utils/veterinary-access';

interface AuthUser {
  id?: string;
  role?: string;
}

const getAllowedSections: ClinicalRecordSection[] = [
  'consultations',
  'allergies',
  'diseases',
  'medications',
  'treatments',
  'surgeries',
];

const getAuthUser = (req: Request): AuthUser => (req as any).user ?? {};

const isGlobalAdmin = (user: AuthUser): boolean => user.role === ROLES.ADMIN;

const respondError = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, message });
};

const findPet = (identifier: string) =>
  Pet.findOne(solvePetIdentifier(identifier) as any);

const hasVeterinaryAccess = async (
  req: Request,
  veterinaryId: string
): Promise<{ userId: string; isAdmin: boolean; owner: boolean } | null> => {
  const user = getAuthUser(req);
  if (!user.id) return null;

  if (isGlobalAdmin(user)) {
    return { userId: user.id, isAdmin: true, owner: true };
  }

  const membership = await getVeterinaryMembership(user.id, veterinaryId);
  if (!membership) return null;

  return {
    userId: user.id,
    isAdmin: false,
    owner: isVeterinaryOwner(membership),
  };
};

const veterinaryController = {
  getMyVeterinaries: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = getAuthUser(req);
      if (!user.id) {
        respondError(res, 401, 'Authentication required');
        return;
      }

      const memberships = await VeterinaryMember.find({
        userId: user.id,
        isActive: true,
      })
        .populate('veterinaryId')
        .sort({ memberRole: 1, createdAt: 1 });

      res.status(200).json({
        success: true,
        data: memberships.filter((membership) => membership.veterinaryId),
      });
    } catch (error) {
      console.error('Error getting veterinary memberships:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  getVeterinary: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId } = req.params as Record<string, string>;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      const veterinary = await Veterinary.findOne({
        _id: veterinaryId,
        isActive: true,
      });

      if (!veterinary) {
        respondError(res, 404, 'Veterinary clinic not found');
        return;
      }

      res.status(200).json({ success: true, data: veterinary });
    } catch (error) {
      console.error('Error getting veterinary:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  getMembers: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId } = req.params as Record<string, string>;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      const members = await VeterinaryMember.find({
        veterinaryId,
        isActive: true,
      })
        .populate('userId', 'email role profile memberId')
        .sort({ memberRole: 1, createdAt: 1 });

      res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error('Error getting veterinary members:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  addMember: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId } = req.params as Record<string, string>;
      const {
        email,
        password,
        name,
        phone,
        memberRole = 'veterinarian',
      } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        phone?: string;
        memberRole?: VeterinaryMemberRole;
      };

      const access = await hasVeterinaryAccess(req, veterinaryId);
      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (!access.owner) {
        respondError(
          res,
          403,
          'Only the clinic owner can manage collaborators'
        );
        return;
      }

      if (!email) {
        respondError(res, 400, 'email is required');
        return;
      }

      if (!['owner', 'veterinarian', 'staff'].includes(memberRole)) {
        respondError(res, 400, 'Invalid memberRole');
        return;
      }

      const veterinary = await Veterinary.findOne({
        _id: veterinaryId,
        isActive: true,
      });
      if (!veterinary) {
        respondError(res, 404, 'Veterinary clinic not found');
        return;
      }

      let targetUser = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      let createdUser = false;

      if (!targetUser) {
        if (!password) {
          respondError(
            res,
            400,
            'password is required to create a new collaborator account'
          );
          return;
        }

        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.valid) {
          res.status(400).json({
            success: false,
            message: passwordValidation.message,
            requirements: passwordValidation.requirements,
          });
          return;
        }

        const result = await createManagedUser({
          email,
          password,
          name,
          phone,
          role:
            memberRole === 'staff' ? ROLES.USER : ROLES.VETERINARIAN,
        });

        targetUser = await User.findById(result.user._id);
        createdUser = result.created;
      }

      if (!targetUser) {
        respondError(res, 500, 'Could not resolve the collaborator account');
        return;
      }

      const existing = await VeterinaryMember.findOne({
        userId: targetUser._id,
        veterinaryId,
      });

      if (existing?.isActive) {
        respondError(res, 409, 'User is already a member of this clinic');
        return;
      }

      const membership = existing
        ? await VeterinaryMember.findByIdAndUpdate(
            existing._id,
            {
              $set: {
                memberRole,
                isActive: true,
                invitedBy: access.userId,
              },
            },
            { new: true }
          )
        : await VeterinaryMember.create({
            userId: targetUser._id,
            veterinaryId,
            memberRole,
            invitedBy: access.userId,
          });

      if (memberRole !== 'staff' && targetUser.role === ROLES.USER) {
        targetUser.role = ROLES.VETERINARIAN;
        await targetUser.save();
      }

      const populated = await VeterinaryMember.findById(membership?._id)
        .populate('userId', 'email role profile memberId')
        .lean();

      res.status(201).json({
        success: true,
        data: populated,
        createdUser,
      });
    } catch (error) {
      console.error('Error adding veterinary member:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  createOwner: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId } = req.params as Record<string, string>;
      const { email, password, name, phone } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        phone?: string;
      };

      const access = await hasVeterinaryAccess(req, veterinaryId);
      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (!access.owner) {
        respondError(
          res,
          403,
          'Only the clinic owner can create pet owner accounts'
        );
        return;
      }

      if (!email || !password) {
        respondError(res, 400, 'email and password are required');
        return;
      }

      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message,
          requirements: passwordValidation.requirements,
        });
        return;
      }

      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (existingUser) {
        respondError(
          res,
          409,
          'A user with that email already exists. Search for the user instead.'
        );
        return;
      }

      const { user, created } = await createManagedUser({
        email,
        password,
        name,
        phone,
        role: ROLES.USER,
      });

      if (!created) {
        respondError(
          res,
          409,
          'A user with that email already exists. Search for the user instead.'
        );
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          email: user.email,
          memberId: user.memberId,
          role: user.role,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error('Error creating pet owner account:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  removeMember: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId, memberId } = req.params as Record<string, string>;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (!access.owner) {
        respondError(
          res,
          403,
          'Only the clinic owner can manage collaborators'
        );
        return;
      }

      const membership = await VeterinaryMember.findOne({
        _id: memberId,
        veterinaryId,
        isActive: true,
      });

      if (!membership) {
        respondError(res, 404, 'Membership not found');
        return;
      }

      if (membership.memberRole === 'owner') {
        const owners = await VeterinaryMember.countDocuments({
          veterinaryId,
          memberRole: 'owner',
          isActive: true,
        });

        if (owners <= 1) {
          respondError(res, 400, 'The clinic must have at least one owner');
          return;
        }
      }

      await VeterinaryMember.updateOne(
        { _id: membership._id },
        { $set: { isActive: false } }
      );

      res.status(200).json({ success: true, message: 'Member removed' });
    } catch (error) {
      console.error('Error removing veterinary member:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  searchOwnerCandidates: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { veterinaryId } = req.params as Record<string, string>;
      const query = String(req.query.query ?? '').trim();

      const access = await hasVeterinaryAccess(req, veterinaryId);
      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (query.length < 2) {
        respondError(res, 400, 'query must have at least 2 characters');
        return;
      }

      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeQuery, 'i');

      const users = await User.find({
        $or: [{ email: regex }, { 'profile.phone': regex }],
      })
        .select('email role profile memberId')
        .limit(10);

      res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('Error searching owner candidates:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  getPets: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId } = req.params as Record<string, string>;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      const pets = await Pet.find({ veterinaryId })
        .populate('owner', 'email role profile memberId')
        .populate('registeredByUserId', 'email role profile memberId')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: pets });
    } catch (error) {
      console.error('Error getting veterinary pets:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  associatePet: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId, petId } = req.params as Record<string, string>;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      const pet = await findPet(petId);
      if (!pet) {
        respondError(res, 404, 'Pet not found');
        return;
      }

      if (pet.veterinaryId && pet.veterinaryId.toString() !== veterinaryId) {
        respondError(
          res,
          409,
          'Pet is already associated with another veterinary clinic'
        );
        return;
      }

      pet.veterinaryId = new Types.ObjectId(veterinaryId);
      pet.registeredByUserId = new Types.ObjectId(access.userId);
      await pet.save();

      res.status(200).json({ success: true, data: pet });
    } catch (error) {
      console.error('Error associating pet with veterinary:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  getClinicalRecord: async (req: Request, res: Response): Promise<void> => {
    try {
      const { veterinaryId, petId } = req.params as Record<string, string>;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      const pet = await findPet(petId);
      if (!pet) {
        respondError(res, 404, 'Pet not found');
        return;
      }

      if (
        !access.isAdmin &&
        pet.veterinaryId?.toString() !== veterinaryId
      ) {
        respondError(
          res,
          403,
          'Pet is not associated with this veterinary clinic'
        );
        return;
      }

      const record = await ClinicalRecord.findOne({
        petId: pet._id,
        veterinaryId,
      });

      res.status(200).json({
        success: true,
        data: {
          pet,
          record: record ?? {
            petId: pet._id,
            veterinaryId,
            consultations: [],
            allergies: [],
            diseases: [],
            medications: [],
            treatments: [],
            surgeries: [],
          },
        },
      });
    } catch (error) {
      console.error('Error getting clinical record:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  addClinicalRecordEntry: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { veterinaryId, petId, section } = req.params as Record<
        string,
        string
      >;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (!getAllowedSections.includes(section as ClinicalRecordSection)) {
        respondError(res, 400, 'Invalid clinical record section');
        return;
      }

      const pet = await findPet(petId);
      if (!pet) {
        respondError(res, 404, 'Pet not found');
        return;
      }

      if (
        !access.isAdmin &&
        pet.veterinaryId?.toString() !== veterinaryId
      ) {
        respondError(
          res,
          403,
          'Pet is not associated with this veterinary clinic'
        );
        return;
      }

      if (
        !req.body ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body)
      ) {
        respondError(res, 400, 'Entry data must be an object');
        return;
      }

      const entry: any = {
        ...req.body,
        createdBy: new Types.ObjectId(access.userId),
        createdAt: new Date(),
      };

      if (section === 'consultations' && !entry.date) {
        entry.date = new Date();
      }

      const record = await ClinicalRecord.findOneAndUpdate(
        { petId: pet._id, veterinaryId },
        {
          $setOnInsert: {
            petId: pet._id,
            veterinaryId,
            createdBy: new Types.ObjectId(access.userId),
          },
          $push: { [section]: entry },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      console.error('Error adding clinical record entry:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  updateClinicalRecordNotes: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { veterinaryId, petId } = req.params as Record<string, string>;
      const { notes } = req.body as { notes?: string };
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (typeof notes !== 'string') {
        respondError(res, 400, 'notes must be a string');
        return;
      }

      const pet = await findPet(petId);
      if (!pet) {
        respondError(res, 404, 'Pet not found');
        return;
      }

      if (
        !access.isAdmin &&
        pet.veterinaryId?.toString() !== veterinaryId
      ) {
        respondError(
          res,
          403,
          'Pet is not associated with this veterinary clinic'
        );
        return;
      }

      const record = await ClinicalRecord.findOneAndUpdate(
        { petId: pet._id, veterinaryId },
        { $set: { notes } },
        { new: true }
      );

      if (!record) {
        respondError(res, 404, 'Clinical record not found');
        return;
      }

      res.status(200).json({ success: true, data: record });
    } catch (error) {
      console.error('Error updating clinical record notes:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  deleteClinicalRecordEntry: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { veterinaryId, petId, section, entryId } = req.params as Record<
        string,
        string
      >;
      const access = await hasVeterinaryAccess(req, veterinaryId);

      if (!access) {
        respondError(res, 403, 'You do not belong to this veterinary clinic');
        return;
      }

      if (!getAllowedSections.includes(section as ClinicalRecordSection)) {
        respondError(res, 400, 'Invalid clinical record section');
        return;
      }

      if (!Types.ObjectId.isValid(entryId)) {
        respondError(res, 400, 'Invalid entryId');
        return;
      }

      const pet = await findPet(petId);
      if (!pet) {
        respondError(res, 404, 'Pet not found');
        return;
      }

      if (
        !access.isAdmin &&
        pet.veterinaryId?.toString() !== veterinaryId
      ) {
        respondError(
          res,
          403,
          'Pet is not associated with this veterinary clinic'
        );
        return;
      }

      const record = await ClinicalRecord.findOneAndUpdate(
        { petId: pet._id, veterinaryId },
        { $pull: { [section]: { _id: new Types.ObjectId(entryId) } } },
        { new: true }
      );

      if (!record) {
        respondError(res, 404, 'Clinical record not found');
        return;
      }

      res.status(200).json({ success: true, data: record });
    } catch (error) {
      console.error('Error deleting clinical record entry:', error);
      respondError(res, 500, 'Internal server error');
    }
  },
};

export default veterinaryController;
