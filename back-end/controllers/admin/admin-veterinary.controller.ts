import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Veterinary from '../../models/Veterinary.model';
import VeterinaryMember from '../../models/VeterinaryMember.model';
import User from '../../models/User.model';
import { ROLES } from '../../middlewares/authMiddleware';
import { validatePasswordStrength } from '../../utils/validate-password';
import { createManagedUser } from '../../utils/create-account';

interface AuthUser {
  id?: string;
}

const getAdminId = (req: Request): string | undefined =>
  ((req as any).user as AuthUser | undefined)?.id;

const respondError = (res: Response, status: number, message: string): void => {
  res.status(status).json({ success: false, message });
};

const adminVeterinaryController = {
  createVeterinary: async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = getAdminId(req);
      if (!adminId) {
        respondError(res, 401, 'Authentication required');
        return;
      }

      const {
        name,
        legalName,
        licenseNumber,
        email,
        phone,
        address,
        city,
        state,
        country,
        website,
        logo,
        ownerEmail,
        ownerPassword,
        ownerName,
        ownerPhone,
      } = req.body as Record<string, string | undefined>;

      if (!name || !email || !phone) {
        respondError(res, 400, 'name, email and phone are required');
        return;
      }

      if (!ownerEmail || !ownerPassword) {
        respondError(
          res,
          400,
          'ownerEmail and ownerPassword are required to create the veterinarian account'
        );
        return;
      }

      const passwordValidation = validatePasswordStrength(ownerPassword);
      if (!passwordValidation.valid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message,
          requirements: passwordValidation.requirements,
        });
        return;
      }

      const existingOwner = await User.findOne({
        email: ownerEmail.toLowerCase().trim(),
      });

      if (existingOwner) {
        respondError(
          res,
          409,
          'A user with the ownerEmail already exists. Use a different email.'
        );
        return;
      }

      const veterinary = await Veterinary.create({
        name,
        legalName,
        licenseNumber,
        email: email.toLowerCase(),
        phone,
        address,
        city,
        state,
        country,
        website,
        logo,
        createdBy: new Types.ObjectId(adminId),
      });

      try {
        const { user: owner, created } = await createManagedUser({
          email: ownerEmail,
          password: ownerPassword,
          name: ownerName,
          phone: ownerPhone,
          role: ROLES.VETERINARIAN,
        });

        if (!created) {
          await Veterinary.deleteOne({ _id: veterinary._id });
          respondError(
            res,
            409,
            'A user with the ownerEmail already exists. Use a different email.'
          );
          return;
        }

        await VeterinaryMember.create({
          userId: owner._id,
          veterinaryId: veterinary._id,
          memberRole: 'owner',
          invitedBy: new Types.ObjectId(adminId),
        });

        res.status(201).json({
          success: true,
          data: veterinary,
          owner: {
            _id: owner._id,
            email: owner.email,
            memberId: owner.memberId,
            role: owner.role,
          },
        });
      } catch (ownerError) {
        await Veterinary.deleteOne({ _id: veterinary._id });
        throw ownerError;
      }
    } catch (error) {
      console.error('Error creating veterinary:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  getAllVeterinaries: async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(parseInt(String(req.query.page ?? '1'), 10), 1);
      const limit = Math.min(
        Math.max(parseInt(String(req.query.limit ?? '20'), 10), 1),
        100
      );
      const search = String(req.query.search ?? '').trim();
      const isActive = req.query.isActive;

      const filter: Record<string, unknown> = {};

      if (search) {
        const safeQuery = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeQuery, 'i');
        filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
      }

      if (isActive !== undefined) {
        filter.isActive = String(isActive) === 'true';
      }

      const [data, total] = await Promise.all([
        Veterinary.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Veterinary.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      console.error('Error getting veterinaries:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  getVeterinaryById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;

      if (!Types.ObjectId.isValid(id)) {
        respondError(res, 400, 'Invalid veterinary id');
        return;
      }

      const veterinary = await Veterinary.findById(id).lean();
      if (!veterinary) {
        respondError(res, 404, 'Veterinary clinic not found');
        return;
      }

      const members = await VeterinaryMember.find({
        veterinaryId: id,
        isActive: true,
      })
        .populate('userId', 'email role profile memberId')
        .lean();

      res.status(200).json({
        success: true,
        data: { ...veterinary, members },
      });
    } catch (error) {
      console.error('Error getting veterinary by id:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  updateVeterinary: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;

      if (!Types.ObjectId.isValid(id)) {
        respondError(res, 400, 'Invalid veterinary id');
        return;
      }

      const allowedFields = [
        'name',
        'legalName',
        'licenseNumber',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'website',
        'logo',
        'isActive',
      ];

      const update: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          update[field] = req.body[field];
        }
      }

      if (typeof update.email === 'string') {
        update.email = update.email.toLowerCase();
      }

      const veterinary = await Veterinary.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });

      if (!veterinary) {
        respondError(res, 404, 'Veterinary clinic not found');
        return;
      }

      res.status(200).json({ success: true, data: veterinary });
    } catch (error) {
      console.error('Error updating veterinary:', error);
      respondError(res, 500, 'Internal server error');
    }
  },

  deleteVeterinary: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as Record<string, string>;

      if (!Types.ObjectId.isValid(id)) {
        respondError(res, 400, 'Invalid veterinary id');
        return;
      }

      const veterinary = await Veterinary.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!veterinary) {
        respondError(res, 404, 'Veterinary clinic not found');
        return;
      }

      await VeterinaryMember.updateMany(
        { veterinaryId: id },
        { $set: { isActive: false } }
      );

      res.status(200).json({
        success: true,
        message: 'Veterinary clinic deactivated',
      });
    } catch (error) {
      console.error('Error deleting veterinary:', error);
      respondError(res, 500, 'Internal server error');
    }
  },
};

export default adminVeterinaryController;
