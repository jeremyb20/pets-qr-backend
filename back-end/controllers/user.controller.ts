import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import User from '../models/User.model';
import Pet from '../models/Pet.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import 'dotenv/config';
import {
  ApiResponse,
  ErrorResponse,
  IUpcomingAppointment,
  MedicalRecordQueryParams,
  PetFilters,
  PetQueryParams,
  SuccessResponse,
  UpcomingAppointmentsQueryParams,
} from '../types/response.type';
import {
  isDewormingInput,
  isMedicalVisitInput,
  isVaccineInput,
  MedicalRecordInput,
  MedicalRecordResponse,
} from '../types/pet.types';
import QrCode from '../models/QrCode.model';
import { Types } from 'mongoose';
import {
  IUser,
  IUserThemeConfig,
  RegistrationRequest,
} from '../interfaces/IUser';
import { IPet } from '../interfaces/Ipet';
import { IProductTableFilters } from '../types/product.types';
import { Product } from '../models/Product.model';
import cacheService from '../config/redis';
import { validatePasswordStrength } from '../utils/validate-password';
import EmailService from '../services/emailService';
import { AdminNotificationService } from '../services/adminNotification.service';

const cloudinaryV2 = cloudinary.v2;

interface AuthRequest {
  email: string;
  password: string;
}

interface UserController {
  authenticate(req: Request, res: Response): Promise<void>;
  me(req: Request, res: Response): Promise<void>;
  getAllPetsByUser(req: Request, res: Response): Promise<void>;
  getSettings(req: Request, res: Response): Promise<void>;
  updateSettings(req: Request, res: Response): Promise<void>;
  getProfileById(req: Request, res: Response): Promise<void>;
  getPublicProfileById(req: Request, res: Response): Promise<void>;
  getMedicalRecordsByPet(req: Request, res: Response): Promise<void>;
  createMedicalRecord(req: Request, res: Response): Promise<void>;
  updateMedicalRecord(req: Request, res: Response): Promise<void>;
  updatePetById(req: Request, res: Response): Promise<void>;
  updateMyProfile(req: Request, res: Response): Promise<void>;
  registerAccountWithEmail(req: Request, res: Response): Promise<void>;
  registerNewPetByQRcode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  addPetToExistingUser(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;

  addPetToAuthenticatedUser(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  validateQrCode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  resetPassword(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  getAllPublishedProductList(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  searchProducts(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  getProductPublishedById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updatePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  getUserPetStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  getUserUpcomingAppointments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  getUserUpcomingAppointmentsGrouped(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  registerPetView(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}

const DefaultPermissions = {
  showPhoneInfo: true,
  showOwnerPetName: true,
  showEmailInfo: true,
  showBirthDate: true,
  showAddressInfo: true,
  showVeterinarianContact: true,
  showPhoneVeterinarian: true,
  showHealthAndRequirements: true,
  showFavoriteActivities: true,
  showLocationInfo: true,
  showLocationConsent: true,
};

const userCtl: UserController = {
  authenticate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as AuthRequest;
      const user = await User.findOne({ email });
      if (!user) {
        res.json({ success: false, message: 'Email not found' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const token = jwt.sign(
          {
            email: user.email,
            id: user._id,
            role: user.role,
            userStatus: user.userStatus,
            memberId: user.memberId,
          },
          process.env.SECRET as string,
          {
            expiresIn: 86400,
          }
        );
        res.json({
          success: true,
          token: token,
          payload: {
            id: user._id,
            userStatus: user.userStatus,
            role: user.role,
            email: user.email,
            memberId: user.memberId,
            configuration: user.configuration,
          },
        });
      } else {
        res.status(500).json({ success: false, message: 'Wrong password' });
      }
    } catch (error) {
      console.error('Error in authenticate method:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (await User.findById((req as any).user?.id)) as IUser;
      if (!user) {
        res.status(404).send({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const userData = {
        _id: user._id,
        email: user.email,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
        userState: user.userStatus,
        role: user.role,
        memberId: user.memberId,
        configuration: user.configuration,
        profile: user.profile,
      };

      res.status(200).send({
        success: true,
        payload: userData,
      });
    } catch (error) {
      console.error('Error in /me endpoint:', error);
      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  getAllPetsByUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        petStatus = '',
        startDate = '',
        endDate = '',
        id = '',
      } = req.query as PetQueryParams;

      if (!id) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'id is required to fetch user pets',
        };
        res.status(400).json(errorResponse);
        return;
      }

      const userExists = await User.findOne({ _id: id }).select('_id');
      if (!userExists) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'User not found with the provided id',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      let petFilter: any = {};

      if (search) {
        petFilter.$or = [
          { petName: { $regex: search, $options: 'i' } },
          { ownerPetName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      if (petStatus && petStatus !== 'all') {
        petFilter.petStatus = petStatus;
      }

      if (startDate || endDate) {
        petFilter.createdAt = {};
        if (startDate) petFilter.createdAt.$gte = new Date(startDate);
        if (endDate) petFilter.createdAt.$lte = new Date(endDate);
      }

      const startTime = Date.now();

      // Obtener todas las mascotas del usuario (sin paginación para contar)
      const allUserPets = await User.findOne({ _id: id })
        .populate({
          path: 'pets',
          match: petFilter,
          select: '_id',
        })
        .select('pets')
        .lean();

      const totalPets = allUserPets?.pets?.length || 0;

      // Obtener las mascotas con paginación
      const userWithPets = await User.findOne({ _id: id })
        .populate({
          path: 'pets',
          match: petFilter,
          select: `
         petName
         petFirstSurname
         petSecondSurname
         memberPetId 
         phone 
         photo 
         birthDate 
         ownerPetName 
         petStatus 
         petViewCounter 
         photo_id 
         isDigitalIdentificationActive 
         permissions 
         weight 
         genderSelected 
         breed 
         favoriteActivities 
         healthAndRequirements 
         address 
         phoneVeterinarian 
         veterinarianContact
         updatedAt
         createdAt
         medicalRecord
         notes
        `,
          options: {
            skip: skip,
            limit: limitNum,
            sort: { createdAt: -1 },
          },
        })
        .select('pets')
        .lean();

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 MongoDB pets query took: ${dbQueryTime}ms`);
      const payload: IPet[] = (userWithPets?.pets || []).map((pet: any) => ({
        _id: pet._id.toString(),
        idParental: id,
        petName: pet.petName || '',
        petFirstSurname: pet.petFirstSurname || '',
        petSecondSurname: pet.petSecondSurname || '',
        petStatus: pet.petStatus || 'No-Perdido',
        email: pet.email,
        phone: pet.phone,
        country: pet.country,
        ownerPetName: pet.ownerPetName,
        birthDate: pet.birthDate,
        phoneVeterinarian: pet.phoneVeterinarian,
        veterinarianContact: pet.veterinarianContact,
        photo: pet.photo,
        lat: pet.lat,
        lng: pet.lng,
        isDigitalIdentificationActive: !!pet.isDigitalIdentificationActive,
        permissions: pet.permissions || [],
        petStatusReport: pet.petStatusReport || [],
        petViewCounter: pet.petViewCounter || [],
        photo_id: pet.photo_id,
        createdAt: pet.createdAt,
        updatedAt: pet.updatedAt,
        breed: pet.breed || '',
        weight: pet.weight || '',
        genderSelected: pet.genderSelected || '',
        favoriteActivities: pet.favoriteActivities || '',
        healthAndRequirements: pet.healthAndRequirements || '',
        address: pet.address || '',
        memberPetId: pet.memberPetId || '',
        medicalRecord: pet.medicalRecord,
        notes: pet.notes || '',
        owner: pet.owner || '',
      }));

      const response: ApiResponse<IPet[]> = {
        success: true,
        payload,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalPets,
          pages: Math.ceil(totalPets / limitNum),
        },
      };

      const totalTime = Date.now() - startTime;
      console.log(`✅ User pets request completed in ${totalTime}ms`);
      console.log(`📈 Found ${totalPets} pets for user ${id}`);

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error fetching user pets:', error);
      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  getPublicProfileById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Buscar en el modelo Pet por memberPetId
      const pet = await Pet.findOne({ memberPetId: id }).select(
        'memberPetId petName petFirstSurname petSecondSurname genderSelected breed weight petStatus birthDate favoriteActivities healthAndRequirements phoneVeterinarian veterinarianContact photo address lat lng linkTwitter linkFacebook linkInstagram isDigitalIdentificationActive petViewCounter permissions petStatusReport createdAt updatedAt phone ownerPetName owner lat lng notes'
      );

      // Si se encuentra la mascota (QR ya convertido en perfil)
      if (pet) {
        let user = null;

        // Asegurarnos de que tenemos el owner id
        const ownerId = pet.owner;

        if (ownerId) {
          try {
            // Intentar buscar el usuario usando el ObjectId directamente
            user = await User.findById(ownerId)
              .select('username email profile')
              .lean();

            // Si no se encuentra, podría ser que owner sea un string en lugar de ObjectId
            if (!user && typeof ownerId === 'string') {
              // Intentar buscar como string
              user = await User.findOne({ _id: ownerId })
                .select('username email profile')
                .lean();
            }

            // Otra posibilidad: el owner podría estar en otro campo diferente
            if (!user) {
              console.log(
                'Owner ID encontrado pero no coincide con usuario:',
                ownerId
              );
            }
          } catch (error) {
            console.error('Error buscando usuario:', error);
          }
        }

        // Convertir el documento de Mongoose a objeto plano
        const petObject = pet.toObject ? pet.toObject() : pet;

        // Preparar datos del owner
        const ownerData = user
          ? {
              _id: user._id,
              username: user.profile?.username || user.username || '',
              email: user.email || '',
              name: user.profile?.name || '',
              phone: user.profile?.phone || '',
              address: user.profile?.address || '',
              city: user.profile?.city || '',
              state: user.profile?.state || '',
              country: user.profile?.country || '',
              photoProfile: user.profile?.photoProfile || '',
              avatarProfile: user.profile?.avatarProfile || '2',
            }
          : {
              _id: ownerId,
              username: '',
              email: '',
              name: '',
              phone: '',
              address: '',
              city: '',
              state: '',
              country: '',
              photoProfile: '',
              avatarProfile: '2',
            };

        // Combinar los datos de forma correcta
        const petWithOwner = {
          ...petObject,
          owner: ownerData,
        };

        res.status(200).json({
          success: true,
          payload: petWithOwner,
          type: 'pet_profile',
        });
        return;
      }

      // Si no se encuentra en Pet, verificar si existe como QR no registrado
      const qrCode = await QrCode.findOne({ randomCode: id }).select(
        'randomCode isAssigned assignedPet createdAt'
      );

      // Si existe el QR (no registrado aún)
      if (qrCode) {
        const QRdata = {
          randomCode: qrCode.randomCode,
          assignedPet: qrCode.assignedPet,
          createdAt: qrCode.createdAt,
        };
        res.status(200).json({
          success: true,
          payload: null,
          qrCode: QRdata,
          type: 'qr_code_unregistered',
        });
        return;
      }

      // No se encuentra ni en Pet ni en QrCode
      res.status(404).json({
        success: false,
        message: 'Código o mascota no encontrada',
        type: 'not_found',
      });
    } catch (error) {
      console.error('Error in getPublicProfileById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  getProfileById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const authenticatedUserId = (req.user as IUser)?.id?.toString(); // Ajusta según cómo manejas la autenticación

      // Buscar en el modelo Pet por memberPetId
      const pet = await Pet.findOne({ memberPetId: id }).select(
        'memberPetId petName petFirstSurname petSecondSurname genderSelected breed weight petStatus birthDate favoriteActivities healthAndRequirements phoneVeterinarian veterinarianContact photo address lat lng linkTwitter linkFacebook linkInstagram isDigitalIdentificationActive petViewCounter permissions petStatusReport createdAt updatedAt phone ownerPetName owner lat lng notes'
      );

      // Si se encuentra la mascota (QR ya convertido en perfil)
      if (pet) {
        // Verificar si el usuario autenticado es el propietario
        const isOwner = pet.owner.toString() === authenticatedUserId;

        // Si NO es el propietario, retornar error
        if (!isOwner) {
          res.status(403).json({
            success: false,
            message: 'No tienes permiso para acceder a esta mascota',
            type: 'unauthorized_access',
          });
          return;
        }

        let user = null;

        // Asegurarnos de que tenemos el owner id
        const ownerId = pet.owner;

        if (ownerId) {
          try {
            // Intentar buscar el usuario usando el ObjectId directamente
            user = await User.findById(ownerId)
              .select('username email profile')
              .lean();

            // Si no se encuentra, podría ser que owner sea un string en lugar de ObjectId
            if (!user && typeof ownerId === 'string') {
              // Intentar buscar como string
              user = await User.findOne({ _id: ownerId })
                .select('username email profile')
                .lean();
            }

            // Otra posibilidad: el owner podría estar en otro campo diferente
            if (!user) {
              console.log(
                'Owner ID encontrado pero no coincide con usuario:',
                ownerId
              );
            }
          } catch (error) {
            console.error('Error buscando usuario:', error);
          }
        }

        // Convertir el documento de Mongoose a objeto plano
        const petObject = pet.toObject ? pet.toObject() : pet;

        // Preparar datos del owner
        const ownerData = user
          ? {
              _id: user._id,
              username: user.profile?.username || user.username || '',
              email: user.email || '',
              name: user.profile?.name || '',
              phone: user.profile?.phone || '',
              address: user.profile?.address || '',
              city: user.profile?.city || '',
              state: user.profile?.state || '',
              country: user.profile?.country || '',
              photoProfile: user.profile?.photoProfile || '',
              avatarProfile: user.profile?.avatarProfile || '2',
            }
          : {
              _id: ownerId,
              username: '',
              email: '',
              name: '',
              phone: '',
              address: '',
              city: '',
              state: '',
              country: '',
              photoProfile: '',
              avatarProfile: '2',
            };

        // Combinar los datos de forma correcta
        const petWithOwner = {
          ...petObject,
          owner: ownerData,
        };

        res.status(200).json({
          success: true,
          payload: petWithOwner,
          type: 'pet_profile',
        });
        return;
      }

      // Si no se encuentra en Pet, verificar si existe como QR no registrado
      const qrCode = await QrCode.findOne({ randomCode: id }).select(
        'randomCode isAssigned assignedPet createdAt'
      );

      // Si existe el QR (no registrado aún)
      if (qrCode) {
        const QRdata = {
          randomCode: qrCode.randomCode,
          assignedPet: qrCode.assignedPet,
          createdAt: qrCode.createdAt,
        };
        res.status(200).json({
          success: true,
          payload: null,
          qrCode: QRdata,
          type: 'qr_code_unregistered',
        });
        return;
      }

      // No se encuentra ni en Pet ni en QrCode
      res.status(404).json({
        success: false,
        message: 'Código o mascota no encontrada',
        type: 'not_found',
      });
    } catch (error) {
      console.error('Error in getProfileById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  getMedicalRecordsByPet: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        type = '',
        startDate = '',
        endDate = '',
        petId = '',
      } = req.query as MedicalRecordQueryParams;

      // Validar que petId esté presente
      if (!petId) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'petId is required to fetch medical records',
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validar que la mascota exista usando memberPetId
      const petExists = await Pet.findOne({ memberPetId: petId }).select('_id');
      if (!petExists) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Pet not found with the provided memberPetId',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const startTime = Date.now();

      // Construir el pipeline de agregación usando memberPetId
      const pipeline: any[] = [
        { $match: { memberPetId: petId } },
        { $unwind: '$medicalRecord' },
      ];

      // Filtro por tipo de registro médico
      let typeFilter = {};
      if (type) {
        switch (type) {
          case 'vaccine':
            typeFilter = {
              'medicalRecord.vaccines': { $exists: true, $ne: [] },
            };
            break;
          case 'deworming':
            typeFilter = {
              'medicalRecord.deworming': { $exists: true, $ne: [] },
            };
            break;
          case 'medical_visit':
            typeFilter = {
              'medicalRecord.datesOfMedicalVisits': { $exists: true, $ne: [] },
            };
            break;
        }
        pipeline.push({ $match: typeFilter });
      }

      // Pipeline para contar el total (sin paginación)
      const countPipeline = [
        { $match: { memberPetId: petId } },
        {
          $project: {
            vaccineCount: {
              $size: { $ifNull: ['$medicalRecord.vaccines', []] },
            },
            dewormingCount: {
              $size: { $ifNull: ['$medicalRecord.deworming', []] },
            },
            visitCount: {
              $size: { $ifNull: ['$medicalRecord.datesOfMedicalVisits', []] },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalVaccines: { $sum: '$vaccineCount' },
            totalDeworming: { $sum: '$dewormingCount' },
            totalVisits: { $sum: '$visitCount' },
          },
        },
      ];

      // Obtener conteos totales
      const countResult = await Pet.aggregate(countPipeline);
      let totalRecords = 0;

      if (countResult.length > 0) {
        const counts = countResult[0];
        switch (type) {
          case 'vaccine':
            totalRecords = counts.totalVaccines;
            break;
          case 'deworming':
            totalRecords = counts.totalDeworming;
            break;
          case 'medical_visit':
            totalRecords = counts.totalVisits;
            break;
          default:
            // Si no hay tipo específico, sumar todos
            totalRecords =
              counts.totalVaccines + counts.totalDeworming + counts.totalVisits;
        }
      }

      // Pipeline para obtener los registros con paginación
      const recordsPipeline = [
        { $match: { memberPetId: petId } },
        {
          $project: {
            vaccines: {
              $map: {
                input: { $ifNull: ['$medicalRecord.vaccines', []] },
                as: 'vaccine',
                in: {
                  _id: '$$vaccine._id',
                  type: 'vaccine',
                  date: '$$vaccine.dateOfApplication',
                  name: '$$vaccine.vaccineName',
                  nextDate: '$$vaccine.nextVaccineDate',
                  observations: '$$vaccine.observations',
                  createdAt: '$$vaccine.createdAt',
                  updatedAt: '$$vaccine.updatedAt',
                },
              },
            },
            deworming: {
              $map: {
                input: { $ifNull: ['$medicalRecord.deworming', []] },
                as: 'deworm',
                in: {
                  _id: '$$deworm._id',
                  type: 'deworming',
                  date: '$$deworm.dateOfApplication',
                  name: '$$deworm.dewormerName',
                  nextDate: '$$deworm.nextDewormingDate',
                  observations: '$$deworm.observations',
                  createdAt: '$$deworm.createdAt',
                  updatedAt: '$$deworm.updatedAt',
                },
              },
            },
            medical_visits: {
              $map: {
                input: { $ifNull: ['$medicalRecord.datesOfMedicalVisits', []] },
                as: 'visit',
                in: {
                  _id: '$$visit._id',
                  type: 'medical_visit',
                  date: '$$visit.visitDate',
                  name: '$$visit.reasonForVisit',
                  veterinarianName: '$$visit.veterinarianName',
                  observations: '$$visit.observations',
                  createdAt: '$$visit.createdAt',
                  updatedAt: '$$visit.updatedAt',
                },
              },
            },
          },
        },
        {
          $project: {
            allRecords: {
              $concatArrays: ['$vaccines', '$deworming', '$medical_visits'],
            },
          },
        },
        { $unwind: '$allRecords' },
        { $replaceRoot: { newRoot: '$allRecords' } },
      ];

      // Aplicar filtros adicionales
      const matchStage: any = {};

      if (type) {
        matchStage['type'] = type;
      }

      if (search) {
        matchStage['$or'] = [
          { name: { $regex: search, $options: 'i' } },
          { observations: { $regex: search, $options: 'i' } },
          { veterinarianName: { $regex: search, $options: 'i' } },
        ];
      }

      if (startDate || endDate) {
        matchStage.date = {};
        if (startDate) matchStage.date.$gte = new Date(startDate);
        if (endDate) matchStage.date.$lte = new Date(endDate);
      }

      if (Object.keys(matchStage).length > 0) {
        recordsPipeline.push({ $match: matchStage });
      }

      // Ordenar por fecha (más reciente primero) y aplicar paginación
      (recordsPipeline as any[]).push(
        { $sort: { date: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      );

      // Ejecutar la consulta
      const records = await Pet.aggregate(recordsPipeline);

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 MongoDB medical records query took: ${dbQueryTime}ms`);

      const payload: MedicalRecordResponse[] = records.map((record: any) => ({
        _id: record._id?.toString() || new Types.ObjectId().toString(),
        type: record.type,
        date: record.date,
        name: record.name,
        nextDate: record.nextDate,
        veterinarianName: record.veterinarianName,
        observations: record.observations,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString(),
      }));

      const response: ApiResponse<MedicalRecordResponse[]> = {
        success: true,
        payload,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalRecords,
          pages: Math.ceil(totalRecords / limitNum),
        },
      };

      const totalTime = Date.now() - startTime;
      console.log(`✅ Medical records request completed in ${totalTime}ms`);
      console.log(`📈 Found ${totalRecords} medical records for pet ${petId}`);

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error fetching medical records:', error);

      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  createMedicalRecord: async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, petId, data } = req.body as {
        type: 'vaccine' | 'deworming' | 'medical_visit';
        petId: string;
        data: MedicalRecordInput;
      };

      // Validaciones básicas
      if (!type || !petId || !data) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Type, petId and data are required',
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validar que la mascota exista
      const pet = await Pet.findOne({ memberPetId: petId });
      if (!pet) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Pet not found with the provided memberPetId',
        };
        res.status(404).json(errorResponse);
        return;
      }

      // Inicializar medicalRecord si no existe
      if (!pet.medicalRecord) {
        pet.medicalRecord = {
          vaccines: [],
          deworming: [],
          datesOfMedicalVisits: [],
        };
      }

      const timestamp = new Date();
      let newRecord: any;
      let updateOperation: any = {};
      let successMessage = '';

      switch (type) {
        case 'vaccine':
          // Validar que los datos sean del tipo correcto usando type guard
          if (!isVaccineInput(data)) {
            const errorResponse: ErrorResponse = {
              success: false,
              message:
                'dateOfApplication, nextVaccineDate and vaccineName are required for vaccines',
            };
            res.status(400).json(errorResponse);
            return;
          }

          newRecord = {
            dateOfApplication: data.dateOfApplication,
            nextVaccineDate: data.nextVaccineDate,
            vaccineName: data.vaccineName,
            observations: data.observations || '',
            _id: new Types.ObjectId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          updateOperation = {
            $push: {
              'medicalRecord.vaccines': newRecord,
            },
          };
          successMessage = 'Vaccine record created successfully';
          break;

        case 'deworming':
          // Validar que los datos sean del tipo correcto usando type guard
          if (!isDewormingInput(data)) {
            const errorResponse: ErrorResponse = {
              success: false,
              message:
                'dateOfApplication, nextDewormingDate and dewormerName are required for deworming',
            };
            res.status(400).json(errorResponse);
            return;
          }

          newRecord = {
            dateOfApplication: data.dateOfApplication,
            nextDewormingDate: data.nextDewormingDate,
            dewormerName: data.dewormerName,
            observations: data.observations || '',
            _id: new Types.ObjectId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          updateOperation = {
            $push: {
              'medicalRecord.deworming': newRecord,
            },
          };
          successMessage = 'Deworming record created successfully';
          break;

        case 'medical_visit':
          // Validar que los datos sean del tipo correcto usando type guard
          if (!isMedicalVisitInput(data)) {
            const errorResponse: ErrorResponse = {
              success: false,
              message:
                'visitDate, reasonForVisit and veterinarianName are required for medical visits',
            };
            res.status(400).json(errorResponse);
            return;
          }

          newRecord = {
            visitDate: data.visitDate,
            reasonForVisit: data.reasonForVisit,
            veterinarianName: data.veterinarianName,
            observations: data.observations || '',
            _id: new Types.ObjectId(),
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          updateOperation = {
            $push: {
              'medicalRecord.datesOfMedicalVisits': newRecord,
            },
          };
          successMessage = 'Medical visit record created successfully';
          break;

        default:
          const errorResponse: ErrorResponse = {
            success: false,
            message: 'Invalid medical record type',
          };
          res.status(400).json(errorResponse);
          return;
      }

      // Actualizar la mascota con el nuevo registro
      const updatedPet = await Pet.findOneAndUpdate(
        { memberPetId: petId },
        updateOperation,
        { new: true, runValidators: true }
      );

      if (!updatedPet) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Failed to create medical record',
        };
        res.status(500).json(errorResponse);
        return;
      }

      const response: SuccessResponse = {
        success: true,
        message: successMessage,
        data: newRecord,
      };

      console.log(`✅ Medical record created for pet ${petId}, type: ${type}`);
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Error creating medical record:', error);

      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  updateMedicalRecord: async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, petId, recordId, data } = req.body as {
        type: 'vaccine' | 'deworming' | 'medical_visit';
        petId: string;
        recordId: string;
        data: Partial<MedicalRecordInput>;
      };

      // Validaciones básicas
      if (!type || !petId || !recordId || !data) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Type, petId, recordId and data are required',
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validar que la mascota exista
      const pet = await Pet.findOne({ memberPetId: petId });
      if (!pet) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Pet not found with the provided memberPetId',
        };
        res.status(404).json(errorResponse);
        return;
      }

      let updateField = '';
      switch (type) {
        case 'vaccine':
          updateField = 'medicalRecord.vaccines';
          break;
        case 'deworming':
          updateField = 'medicalRecord.deworming';
          break;
        case 'medical_visit':
          updateField = 'medicalRecord.datesOfMedicalVisits';
          break;
        default:
          const errorResponse: ErrorResponse = {
            success: false,
            message: 'Invalid medical record type',
          };
          res.status(400).json(errorResponse);
          return;
      }

      // Construir el objeto de actualización dinámicamente
      const updateData: any = {
        updatedAt: new Date(),
      };

      Object.keys(data).forEach((key) => {
        if (data[key as keyof MedicalRecordInput] !== undefined) {
          updateData[`${updateField}.$.${key}`] =
            data[key as keyof MedicalRecordInput];
        }
      });

      // Actualizar el registro específico
      const updatedPet = await Pet.findOneAndUpdate(
        {
          memberPetId: petId,
          [`${updateField}._id`]: new Types.ObjectId(recordId),
        },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedPet) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: 'Medical record not found or update failed',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: SuccessResponse = {
        success: true,
        message: 'Medical record updated successfully',
      };

      console.log(
        `✅ Medical record updated for pet ${petId}, type: ${type}, recordId: ${recordId}`
      );
      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error updating medical record:', error);
      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  updatePetById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { petData, userId, removePhoto } = req.body;

      if (!petData) {
        res.status(400).json({
          success: false,
          message: 'petData is required',
        });
        return;
      }

      // Parsear petData (viene como string desde FormData)
      const parsedPetData =
        typeof petData === 'string' ? JSON.parse(petData) : petData;

      const { id, permissions, photo_id, ...updateFields } = parsedPetData;

      // Buscar la mascota
      const pet = await Pet.findById(id);
      if (!pet) {
        res.status(404).json({
          success: false,
          message: 'Pet not found',
        });
        return;
      }
      // Verificar que el usuario sea el dueño (si se proporciona userId)
      if (userId && pet?.owner?.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to update this pet',
        });
        return;
      }

      // Manejar eliminación de foto existente
      const shouldRemovePhoto =
        removePhoto === 'true' || (photo_id && !req.file);

      if (shouldRemovePhoto && pet.photo_id) {
        try {
          // Eliminar de Cloudinary
          await cloudinaryV2.uploader.destroy(pet.photo_id);
          console.log(`Deleted old photo from Cloudinary: ${pet.photo_id}`);

          // Limpiar campos de foto
          updateFields.photo = null;
          updateFields.photo_id = null;
        } catch (error) {
          console.error('Error deleting old photo from Cloudinary:', error);
        }
      }

      // Manejar nueva foto subida
      if (req.file) {
        try {
          // Eliminar foto anterior si existe
          if (pet.photo_id) {
            try {
              await cloudinaryV2.uploader.destroy(pet.photo_id);
              console.log(`Deleted old photo from Cloudinary: ${pet.photo_id}`);
            } catch (error) {
              console.error('Error deleting old photo from Cloudinary:', error);
            }
          }

          // Subir nueva foto a Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinaryV2.uploader.upload_stream(
              {
                folder: 'pets',
                transformation: [
                  { width: 500, height: 500, crop: 'fill' },
                  { quality: 'auto' },
                  { format: 'auto' },
                ],
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );

            uploadStream.end(req.file!.buffer);
          });

          // Actualizar campos de foto
          updateFields.photo = (uploadResult as any).secure_url;
          updateFields.photo_id = (uploadResult as any).public_id;
        } catch (uploadError) {
          console.error('Error uploading to Cloudinary:', uploadError);
          res.status(500).json({
            success: false,
            message: 'Internal server error, please try again later.',
            code: 'INTERNAL_ERROR',
          });
          return;
        }
      }

      // Preparar datos finales para actualizar
      const finalUpdateData = {
        ...updateFields,
        // Mantener permissions si se enviaron
        ...(permissions && { permissions }),
        updatedAt: new Date(),
      };

      // Actualizar la mascota
      await Pet.findByIdAndUpdate(id, finalUpdateData, { new: true });

      res.status(200).json({
        success: true,
        message: 'Pet updated successfully',
      });
    } catch (error) {
      console.error('Error en addPetToExistingUser:', error);

      // Manejar errores de duplicación de MongoDB
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        res.status(409).json({
          success: false,
          message: 'An error occurred while updating pet',
        });
        return;
      }

      // Manejar errores de validación de Mongoose
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación en los datos de la mascota',
          errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  updateMyProfile: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      const {
        email,
        name,
        phone,
        country,
        userStatus,
        role,
        pets,
        address,
        zipCode,
        state,
        city,
        photoProfile,
        isPublic,
        // Nuevos campos para configuration
        configuration,
        profile,
        avatarProfile,
      } = req.body;
      const id = (req.user as IUser)?.id?.toString();
      // Construir el objeto de actualización
      const updateData: any = {
        email,
        userStatus,
        role,
        pets,
        updatedAt: new Date(),
      };

      // Si se envían datos de profile, actualizarlos
      if (profile) {
        updateData.profile = profile;
      } else {
        // Actualizar campos individuales de profile si se envían por separado
        const profileUpdates: any = {};
        if (name !== undefined) profileUpdates.name = name;
        if (phone !== undefined) profileUpdates.phone = phone;
        if (address !== undefined) profileUpdates.address = address;
        if (country !== undefined) profileUpdates.country = country;
        if (zipCode !== undefined) profileUpdates.zipCode = zipCode;
        if (state !== undefined) profileUpdates.state = state;
        if (city !== undefined) profileUpdates.city = city;
        if (isPublic !== undefined) profileUpdates.isPublic = isPublic;
        if (photoProfile !== undefined)
          profileUpdates.photoProfile = photoProfile;
        if (avatarProfile !== undefined)
          profileUpdates.avatarProfile = avatarProfile;

        if (Object.keys(profileUpdates).length > 0) {
          updateData.$set = {
            ...updateData.$set,
            ...Object.fromEntries(
              Object.entries(profileUpdates).map(([key, value]) => [
                `profile.${key}`,
                value,
              ])
            ),
          };
        }
      }

      // Si se envían datos de configuration, actualizarlos
      if (configuration) {
        updateData.configuration = configuration;
      }

      await User.findByIdAndUpdate(id, updateData);

      res.status(200).send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  getSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (await User.findById((req as any).user?.id)) as IUser;
      if (user) {
        const data = user.configuration;
        res.status(200).send({ success: true, payload: data });
      }
    } catch (error) {
      res.status(500).send({
        success: false,
        message: 'Internal server error, please try again later.',
        error: (error as Error).message,
      });
    }
  },

  updateSettings: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { theme, permissions } = req.body;

      // Validar datos requeridos
      if (!theme) {
        res.status(400).json({
          success: false,
          message: 'Theme configuration is required',
        });
        return;
      }

      // Validar campos del tema
      const validTheme = {
        themeMode: theme.themeMode || 'light',
        themeContrast: theme.themeContrast || 'default',
        themeDirection: theme.themeDirection || 'ltr',
        themeLayout: theme.themeLayout || 'vertical',
        themeStretch: Boolean(theme.themeStretch),
        themeColorPresets: theme.themeColorPresets || 'default',
        fontSizeScale: theme.fontSizeScale || 1,
        updatedAt: new Date(),
      };

      // Actualizar usuario
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'configuration.theme': validTheme,
            ...(permissions && { 'configuration.permissions': permissions }),
          },
        },
        { new: true } // Para retornar el documento actualizado
      );

      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        payload: {
          theme: updatedUser?.configuration?.theme || validTheme,
          permissions:
            updatedUser?.configuration?.permissions || permissions || {},
          _id: updatedUser?._id,
        },
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  registerAccountWithEmail: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        country,
        username: customUsername,
        settings,
      } = req.body as IUser & {
        phone: string;
        country: string;
        settings: IUserThemeConfig;
      };

      // Validar campos requeridos
      if (
        !email ||
        !password ||
        !firstName ||
        !lastName ||
        !phone ||
        !country
      ) {
        res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos',
        });
        return;
      }

      // Validar términos y condiciones
      // if (termsAccepted !== true) {
      //   res.status(400).json({
      //     success: false,
      //     message: 'Debes aceptar los términos y condiciones',
      //   });
      //   return;
      // }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'El formato del correo electrónico no es válido',
        });
        return;
      }

      // Validar fortaleza de contraseña
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!passwordRegex.test(password)) {
        res.status(400).json({
          success: false,
          message:
            'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
        });
        return;
      }

      // Paso 1: Verificar si el correo electrónico ya existe
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingEmail) {
        res.status(409).json({
          success: false,
          message: 'El correo electrónico ya está registrado',
        });
        return;
      }

      // Paso 2: Generar memberId único
      const generateMemberId = async (): Promise<string> => {
        let memberId: string;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 100) {
          memberId = Math.floor(100000 + Math.random() * 900000).toString();
          const existingUser = await User.findOne({ memberId });
          if (!existingUser) isUnique = true;
          attempts++;
        }

        if (!isUnique) throw new Error('No se pudo generar memberId único');
        return memberId!;
      };

      // Paso 3: Generar o validar username
      const generateUsername = async (
        baseUsername: string
      ): Promise<string> => {
        let username = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
        let isUnique = false;
        let attempts = 0;
        let finalUsername = username;

        while (!isUnique && attempts < 100) {
          const existingUser = await User.findOne({ username: finalUsername });
          if (!existingUser) {
            isUnique = true;
          } else {
            finalUsername = `${username}${Math.floor(
              1000 + Math.random() * 9000
            )}`;
            attempts++;
          }
        }

        if (!isUnique) throw new Error('No se pudo generar username único');
        return finalUsername;
      };

      // Paso 4: Verificar si username ya existe (solo si fue proporcionado)
      if (customUsername) {
        const existingUsername = await User.findOne({
          'profile.username': customUsername.toLowerCase(),
        });
        if (existingUsername) {
          res.status(409).json({
            success: false,
            message: 'El nombre de usuario ya está en uso',
          });
          return;
        }
      }

      // Generar IDs únicos
      const memberId = await generateMemberId();
      const username = await generateUsername(email.split('@')[0]);

      // Paso 5: Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 12);

      const defaultTheme = {
        fontSizeScale: 0.85,
        themeColorPresets: 'default',
        themeContrast: 'default',
        themeDirection: 'ltr',
        themeLayout: 'vertical',
        themeMode: 'dark',
        themeStretch: false,
      };

      // Paso 7: Crear nuevo usuario
      const newUser = new User({
        memberId: memberId,
        email: email.toLowerCase(),
        password: hashedPassword,
        userStatus: 1, // Activo
        role: 3, // Rol de usuario normal
        isActivated: false, // Activado automáticamente para registro normal
        pets: [],
        configuration: {
          theme: settings || defaultTheme,
          permissions: {
            showPhoneInfo: true,
            showEmailInfo: true,
            showPersonalInfo: true,
          },
        },
        profile: {
          name: `${firstName} ${lastName}`,
          firstName: firstName,
          lastName: lastName,
          username: username,
          phone: phone,
          country: country,
          address: '',
          city: '',
          state: '',
          isPublic: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedUser = await newUser.save();

      // Paso 8: Generar token JWT para autenticación automática
      const token = jwt.sign(
        {
          email: savedUser.email,
          id: savedUser._id,
          role: savedUser.role,
          userStatus: savedUser.userStatus,
          memberId: savedUser.memberId,
        },
        process.env.JWT_SECRET || process.env.SECRET || 'default-secret-key',
        {
          expiresIn: '7d', // Token válido por 7 días
        }
      );

      // // Paso 9: Enviar email de verificación (opcional)
      // try {
      //   // Aquí puedes implementar el envío de email de verificación
      //   console.log(`📧 Email de verificación enviado a: ${savedUser.email}`);

      //   await savedUser.save();

      //   // TODO: Implementar servicio de email
      //   // await sendVerificationEmail(savedUser.email, verificationToken);
      // } catch (emailError) {
      //   console.error('❌ Error enviando email de verificación:', emailError);
      //   // No fallar el registro si hay error en el email
      // }

      AdminNotificationService.notifyNewUser(savedUser).catch((error) => {
        console.error(
          'Error enviando notificación al admin (no crítico):',
          error
        );
      });

      // Paso 10: Responder con éxito
      res.status(201).json({
        success: true,
        message: 'Cuenta creada exitosamente',
        data: {
          user: {
            id: savedUser._id,
            memberId: savedUser.memberId,
            name: savedUser.profile.name,
            email: savedUser.email,
            username: savedUser.profile.username,
            phone: savedUser.profile.phone,
            country: savedUser.profile.country,
            role: savedUser.role,
          },
          token: token,
        },
      });
    } catch (error) {
      console.error('Error en registerAccount:', error);

      // Manejar errores de duplicación de MongoDB
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        let message = 'Error de duplicación';

        if (field === 'email')
          message = 'El correo electrónico ya está registrado';
        if (field === 'memberId')
          message = 'Error interno, por favor intenta de nuevo';
        if (field === 'profile.username')
          message = 'El nombre de usuario ya está en uso';

        res.status(409).json({
          success: false,
          message: message,
        });
        return;
      }

      // Manejar errores de validación de Mongoose
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors,
        });
        return;
      }

      // Manejar errores personalizados
      if ((error as any).message.includes('No se pudo generar')) {
        res.status(500).json({
          success: false,
          message: 'Internal server error, please try again later.',
          code: 'INTERNAL_ERROR',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Registra nuevo usuario con una nueva mascota con el codigo
  registerNewPetByQRcode: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      const { code, userData, petData }: RegistrationRequest = req.body;

      // Validación básica de los datos de entrada
      if (!code || !userData || !petData) {
        res.status(400).json({
          success: false,
          message: 'Datos incompletos. Se requiere código, userData y petData.',
        });
        return;
      }

      // Parsear los datos si vienen como strings (desde FormData)
      const parsedUserData =
        typeof userData === 'string' ? JSON.parse(userData) : userData;

      const parsedPetData =
        typeof petData === 'string' ? JSON.parse(petData) : petData;

      // Paso 1: Validar si el código QR existe y está disponible
      const qrCode = await QrCode.findOne({ randomCode: code });

      if (!qrCode) {
        res.status(404).json({
          success: false,
          message: 'Código QR no encontrado.',
        });
        return;
      }

      if (qrCode.status !== 'available') {
        res.status(400).json({
          success: false,
          message: `El código QR no está disponible. Estado actual: ${qrCode.status}`,
        });
        return;
      }

      // Paso 2: Verificar si el correo electrónico ya existe
      const existingUser = await User.findOne({
        email: parsedUserData.email.toLowerCase(),
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'El correo electrónico ya está registrado.',
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parsedUserData.email)) {
        res.status(400).json({
          success: false,
          message: 'El formato del correo electrónico no es válido.',
        });
        return;
      }

      // Paso 3: Manejar la foto de la mascota si existe
      let petPhotoUrl = null;
      let petPhotoId = null;

      if (req.file) {
        try {
          console.log('📸 Subiendo foto de mascota a Cloudinary...');

          const result = await cloudinaryV2.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString(
              'base64'
            )}`,
            {
              folder: 'mascotas_cr',
              resource_type: 'image',
              transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto' },
                { format: 'webp' },
              ],
            }
          );

          petPhotoUrl = result.secure_url;
          petPhotoId = result.public_id;
          console.log(`✅ Foto subida: ${petPhotoUrl}`);
        } catch (uploadError) {
          console.error('❌ Error subiendo foto:', uploadError);
          // Continuar sin foto si hay error
        }
      }

      // Paso 4: Crear la cuenta de usuario
      const hashedPassword = await bcrypt.hash(parsedUserData.password, 12);

      // Función para generar memberId único
      const generateMemberId = async (): Promise<string> => {
        let memberId: string;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 100) {
          memberId = Math.floor(100000 + Math.random() * 900000).toString();
          const existingUser = await User.findOne({ memberId });
          if (!existingUser) isUnique = true;
          attempts++;
        }

        if (!isUnique) throw new Error('No se pudo generar memberId único');
        return memberId!;
      };

      // Función para generar username único
      const generateUsername = async (
        baseUsername: string
      ): Promise<string> => {
        let username = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
        let isUnique = false;
        let attempts = 0;
        let finalUsername = username;

        while (!isUnique && attempts < 100) {
          const existingUser = await User.findOne({ username: finalUsername });
          if (!existingUser) {
            isUnique = true;
          } else {
            finalUsername = `${username}${Math.floor(
              1000 + Math.random() * 9000
            )}`;
            attempts++;
          }
        }

        if (!isUnique) throw new Error('No se pudo generar username único');
        return finalUsername;
      };

      // Generar IDs únicos
      const memberId = await generateMemberId();
      const baseUsername = parsedUserData.email.split('@')[0];
      const username = await generateUsername(baseUsername);

      const newUser = new User({
        memberId: memberId,
        email: parsedUserData.email.toLowerCase(),
        password: hashedPassword,
        userStatus: 1,
        role: 3,
        isActivated: false,
        pets: [],
        configuration: {
          theme: {
            fontSizeScale: 0.85,
            themeColorPresets: 'default',
            themeContrast: 'default',
            themeDirection: 'ltr',
            themeLayout: 'vertical',
            themeMode: 'dark',
            themeStretch: false,
          },
          permissions: {
            showPhoneInfo: true,
            showEmailInfo: true,
            showPersonalInfo: true,
          },
        },
        profile: {
          name: `${parsedUserData.firstName} ${parsedUserData.lastName}`,
          username: username,
          phone: parsedUserData.phone,
          country: parsedUserData.country,
          address: '',
          city: '',
          state: '',
          zipCode: '',
          avatarProfile: '1',
          isPublic: false,
        },
      });

      const savedUser = await newUser.save();

      // Paso 5: Crear la mascota y asociarla al usuario
      const newPet = new Pet({
        owner: savedUser._id,
        memberPetId: code,
        petName: parsedPetData.petName,
        breed: parsedPetData.breed,
        genderSelected: parsedPetData.genderSelected,
        birthDate: parsedPetData.birthDate || null,
        weight: parsedPetData.weight || null,
        favoriteActivities: parsedPetData.favoriteActivities || null,
        healthAndRequirements: parsedPetData.healthAndRequirements || null,
        phone: parsedUserData.phone,
        ownerPetName: `${parsedUserData.firstName} ${parsedUserData.lastName}`,
        petStatus: 'active',
        // Agregar la foto si se subió exitosamente
        ...(petPhotoUrl && {
          photo: petPhotoUrl,
          photo_id: petPhotoId,
        }),
        permissions: DefaultPermissions,
        medicalRecord: {
          vaccines: [],
          deworming: [],
          datesOfMedicalVisits: [],
        },
        qrCode: qrCode._id,
      });

      const savedPet = await newPet.save();

      // Paso 6: Actualizar el usuario para agregar la mascota
      savedUser.pets.push(savedPet._id);
      await savedUser.save();
      // Paso 7: Actualizar el código QR como usado
      await QrCode.findByIdAndUpdate(qrCode._id, {
        status: 'used',
        assignedTo: savedUser._id,
        assignedPet: savedPet._id,
        activationDate: new Date(),
        updatedAt: new Date(),
      });

      AdminNotificationService.notifyNewPet(savedPet, savedUser).catch(
        (error) => {
          console.error(
            'Error enviando notificación al admin (no crítico):',
            error
          );
        }
      );

      // Paso 8: Responder con éxito
      res.status(201).json({
        success: true,
        message: 'Registro completado exitosamente',
        data: {
          user: {
            id: savedUser._id,
            firstName: parsedUserData.firstName,
            lastName: parsedUserData.lastName,
            email: savedUser.email,
            username: savedUser.profile.username,
          },
          pet: {
            id: savedPet._id,
            petName: savedPet.petName,
            memberPetId: savedPet.memberPetId,
            photo: savedPet.photo, // Incluir info de la foto en la respuesta
          },
          qrCode: {
            code: code,
            status: 'used',
          },
        },
      });
    } catch (error) {
      console.error('Error en registerNewPetByQRcode:', error);

      // Manejar errores de duplicación de MongoDB
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        res.status(409).json({
          success: false,
          message: `El ${field} ya está en uso.`,
        });
        return;
      }

      // Manejar errores de validación de Mongoose
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Registra una mascota a un usuario ya existente
  addPetToExistingUser: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      // Para FormData, los campos vienen directamente en req.body
      const { code, userCredentials, petData } = req.body;
      if (!code || !userCredentials || !petData) {
        res.status(400).json({
          success: false,
          message: 'Datos incompletos.',
        });
        return;
      }

      // Parsear los datos si vienen como strings (puede pasar con FormData)
      const parsedUserCredentials =
        typeof userCredentials === 'string'
          ? JSON.parse(userCredentials)
          : userCredentials;

      const parsedPetData =
        typeof petData === 'string' ? JSON.parse(petData) : petData;

      // Paso 1: Validar si el código QR existe y está disponible
      const qrCode = await QrCode.findOne({ randomCode: code });

      if (!qrCode) {
        res.status(404).json({
          success: false,
          message: 'Código QR no encontrado.',
        });
        return;
      }

      if (qrCode.status !== 'available') {
        res.status(400).json({
          success: false,
          message: `El código QR no está disponible. Estado actual: ${qrCode.status}`,
        });
        return;
      }

      // Paso 2: Verificar credenciales del usuario
      const existingUser = await User.findOne({
        email: parsedUserCredentials.email.toLowerCase(),
      }).select('+password');

      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado.',
        });
        return;
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(
        parsedUserCredentials.password,
        existingUser.password
      );

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.',
        });
        return;
      }

      // Verificar que el usuario esté activo
      if (Number(existingUser.userStatus) === 5) {
        res.status(403).json({
          success: false,
          message: 'La cuenta de usuario no está activa.',
        });
        return;
      }

      // Verificar que el usuario no tenga ya una mascota con el mismo código
      const existingPetWithSameCode = await Pet.findOne({
        memberPetId: code,
        owner: existingUser._id,
      });

      if (existingPetWithSameCode) {
        res.status(409).json({
          success: false,
          message: 'Ya tienes una mascota registrada con este código.',
        });
        return;
      }

      // Verificar límite de mascotas por usuario
      const userPetsCount = await Pet.countDocuments({
        owner: existingUser._id,
      });
      const MAX_PETS_PER_USER = parseInt(
        process.env.MAX_PETS_PER_USER || '10',
        10
      );

      if (userPetsCount >= MAX_PETS_PER_USER) {
        res.status(400).json({
          success: false,
          message: `Has alcanzado el límite máximo de ${MAX_PETS_PER_USER} mascotas por usuario.`,
        });
        return;
      }

      // Paso 3: Manejar la foto de la mascota si existe
      let petPhotoUrl = null;
      let petPhotoId = null;

      if (req.file) {
        try {
          const result = await cloudinaryV2.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString(
              'base64'
            )}`,
            {
              folder: 'mascotas_cr',
              resource_type: 'image',
              transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto' },
                { format: 'webp' },
              ],
            }
          );

          petPhotoUrl = result.secure_url;
          petPhotoId = result.public_id;
        } catch (uploadError) {
          console.error('❌ Error subiendo foto:', uploadError);
        }
      }

      // Paso 4: Crear la nueva mascota
      const newPet = new Pet({
        owner: existingUser._id,
        memberPetId: code,
        petName: parsedPetData.petName,
        breed: parsedPetData.breed,
        genderSelected: parsedPetData.genderSelected,
        birthDate: parsedPetData.birthDate || null,
        weight: parsedPetData.weight || null,
        favoriteActivities: parsedPetData.favoriteActivities || null,
        healthAndRequirements: parsedPetData.healthAndRequirements || null,
        phone: existingUser.profile.phone,
        ownerPetName: existingUser.profile.name,
        petStatus: 'active',
        // Agregar la foto si se subió exitosamente
        ...(petPhotoUrl && {
          photo: petPhotoUrl,
          photo_id: petPhotoId,
        }),
        permissions: DefaultPermissions,
        medicalRecord: {
          vaccines: [],
          deworming: [],
          datesOfMedicalVisits: [],
        },
        qrCode: qrCode._id,
      });

      const savedPet = await newPet.save();

      // Paso 5: Actualizar el usuario
      existingUser.pets.push(savedPet._id);
      await existingUser.save();
      AdminNotificationService.notifyNewPet(savedPet, existingUser).catch(
        (error) => {
          console.error(
            'Error enviando notificación al admin (no crítico):',
            error
          );
        }
      );
      // Paso 6: Responder con éxito
      res.status(201).json({
        success: true,
        message: 'Mascota agregada exitosamente a tu cuenta',
        data: {
          user: {
            id: existingUser._id,
            name: existingUser.profile.name,
            email: existingUser.email,
            username: existingUser.profile.username,
            totalPets: userPetsCount + 1,
          },
          pet: {
            id: savedPet._id,
            petName: savedPet.petName,
            memberPetId: savedPet.memberPetId,
            breed: savedPet.breed,
            photo: savedPet.photo,
          },
          qrCode: {
            code: code,
            status: 'used',
          },
        },
      });
    } catch (error) {
      console.error('Error en addPetToExistingUser:', error);

      // Manejar errores de duplicación de MongoDB
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        res.status(409).json({
          success: false,
          message: `El ${field} ya está en uso.`,
        });
        return;
      }

      // Manejar errores de validación de Mongoose
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación en los datos de la mascota',
          errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Agrega una mascota a un usuario autenticado sin codigo qr
  addPetToAuthenticatedUser: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      // Para FormData, los campos vienen directamente en req.body
      const { petData, userId } = req.body;

      if (!petData || !userId) {
        res.status(400).json({
          success: false,
          message: 'Datos incompletos. Se requieren petData y userId',
        });
        return;
      }

      // Verificar que el usuario esté autenticado y coincida con el userId

      const authenticatedUser = (req.user as IUser)?.id?.toString();

      if (!authenticatedUser) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      // Verificar que el userId de la solicitud coincida con el usuario autenticado
      if (authenticatedUser !== userId.toString()) {
        res.status(403).json({
          success: false,
          message: 'No tienes permiso para agregar mascotas a este usuario',
        });
        return;
      }

      // Parsear petData si viene como string (puede pasar con FormData)
      const parsedPetData =
        typeof petData === 'string' ? JSON.parse(petData) : petData;

      // Validar campos requeridos en petData
      if (
        !parsedPetData.petName ||
        !parsedPetData.breed ||
        !parsedPetData.genderSelected
      ) {
        res.status(400).json({
          success: false,
          message:
            'Datos de mascota incompletos. Se requieren: petName, breed, genderSelected',
        });
        return;
      }

      // Buscar al usuario por ID
      const existingUser = await User.findById(userId);

      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado.',
        });
        return;
      }

      // Verificar que el usuario esté activo
      if (Number(existingUser.userStatus) === 5) {
        res.status(403).json({
          success: false,
          message: 'La cuenta de usuario no está activa.',
        });
        return;
      }

      // Verificar límite de mascotas por usuario
      const userPetsCount = await Pet.countDocuments({
        owner: existingUser._id,
      });
      const MAX_PETS_PER_USER = 10;

      if (userPetsCount >= MAX_PETS_PER_USER) {
        res.status(400).json({
          success: false,
          message: `Has alcanzado el límite máximo de ${MAX_PETS_PER_USER} mascotas por usuario.`,
        });
        return;
      }

      // Generar un código único para la mascota (memberPetId)

      const generateMemberId = async (): Promise<string> => {
        let memberId: string;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 100) {
          memberId = Math.floor(100000 + Math.random() * 900000).toString();
          const existingUser = await User.findOne({ memberId });
          if (!existingUser) isUnique = true;
          attempts++;
        }

        if (!isUnique) throw new Error('No se pudo generar memberId único');
        return memberId!;
      };

      const memberPetId = await generateMemberId();

      // Paso 3: Manejar la foto de la mascota si existe
      let petPhotoUrl = null;
      let petPhotoId = null;

      if (req.file) {
        try {
          const result = await cloudinaryV2.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString(
              'base64'
            )}`,
            {
              folder: 'mascotas_cr',
              resource_type: 'image',
              transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto' },
                { format: 'webp' },
              ],
            }
          );

          petPhotoUrl = result.secure_url;
          petPhotoId = result.public_id;
        } catch (uploadError) {
          console.error('❌ Error subiendo foto:', uploadError);
          // No fallar si hay error en la foto, continuar sin ella
        }
      }

      // Paso 4: Crear la nueva mascota
      const newPet = new Pet({
        owner: existingUser._id,
        memberPetId, // Código generado automáticamente
        petName: parsedPetData.petName,
        petFirstSurname: parsedPetData.petFirstSurname || 'N/A',
        petSecondSurname: parsedPetData.petSecondSurname || 'N/A',
        breed: parsedPetData.breed,
        genderSelected: parsedPetData.genderSelected,
        birthDate: parsedPetData.birthDate || null,
        weight: parsedPetData.weight || null,
        favoriteActivities: parsedPetData.favoriteActivities || null,
        healthAndRequirements: parsedPetData.healthAndRequirements || null,
        phone: existingUser.profile.phone,
        ownerPetName: existingUser.profile.name,
        petStatus: 'active',
        // Agregar la foto si se subió exitosamente
        ...(petPhotoUrl && {
          photo: petPhotoUrl,
          photo_id: petPhotoId,
        }),
        permissions: DefaultPermissions,
        medicalRecord: {
          vaccines: [],
          deworming: [],
          datesOfMedicalVisits: [],
        },
        // No asociamos un QR code específico ya que es generado automáticamente
      });

      const savedPet = await newPet.save();

      // Paso 5: Actualizar el usuario
      existingUser.pets.push(savedPet._id);
      await existingUser.save();

      // Paso 6: Crear un registro de QR code para esta mascota (opcional)
      // Si quieres mantener el mismo sistema de QR codes
      const newQrCode = new QrCode({
        randomCode: memberPetId,
        status: 'assigned',
        assignedTo: existingUser._id,
        assignedPet: savedPet._id,
        activationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newQrCode.save();

      AdminNotificationService.notifyNewPet(savedPet, existingUser).catch(
        (error) => {
          console.error(
            'Error enviando notificación al admin (no crítico):',
            error
          );
        }
      );

      // Paso 7: Responder con éxito
      res.status(201).json({
        success: true,
        message: 'Mascota agregada exitosamente a tu cuenta',
        payload: {
          user: {
            id: existingUser._id,
            name: existingUser.profile.name,
            email: existingUser.email,
            username: existingUser.profile.username,
            totalPets: userPetsCount + 1,
          },
          pet: {
            id: savedPet._id,
            petName: savedPet.petName,
            memberPetId: savedPet.memberPetId, // Código generado
            breed: savedPet.breed,
            photo: savedPet.photo,
            qrCode: newQrCode.randomCode, // Código del QR
          },
          qrCode: {
            code: memberPetId,
            status: 'assigned',
          },
        },
      });
    } catch (error) {
      console.error('Error en addPetToAuthenticatedUser:', error);

      // Manejar errores de duplicación de MongoDB
      if ((error as any).code === 11000) {
        const field = Object.keys((error as any).keyValue)[0];
        res.status(409).json({
          success: false,
          message: `El ${field} ya está en uso.`,
        });
        return;
      }

      // Manejar errores de validación de Mongoose
      if ((error as any).name === 'ValidationError') {
        const errors = Object.values((error as any).errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación en los datos de la mascota',
          errors,
        });
        return;
      }

      // Manejar errores de JSON parse
      if (
        (error as any).name === 'SyntaxError' &&
        (error as any).message.includes('JSON')
      ) {
        res.status(400).json({
          success: false,
          message: 'Formato JSON inválido en petData',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al agregar la mascota',
      });
    }
  },

  // Verifica si el QR es valido y activo
  validateQrCode: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      const { code } = req.query;

      if (!code) {
        res.status(400).json({
          success: false,
          message: 'QR code is required.',
        });
        return;
      }

      const qrCode = await QrCode.findOne({ randomCode: code });

      if (!qrCode) {
        res.status(404).json({
          success: false,
          message: 'QR code not found.',
        });
        return;
      }

      if (qrCode.status !== 'available') {
        res.status(400).json({
          success: false,
          message: `QR code is not available. Current status: "${qrCode.status}".`,
        });
        return;
      }

      // Si todo está bien
      res.json({
        success: true,
        message: 'QR code is valid.',
        data: qrCode,
      });
    } catch (error) {
      console.error('Error validating QR code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  // Obtener lista de productos publicados con paginación, búsqueda y filtros
  async getAllPublishedProductList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        ...filters
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Crear clave de caché única para esta consulta
      const cacheKey = `products:published:page:${pageNum}:limit:${limitNum}:search:${search}:sortBy:${sortBy}:sortOrder:${sortOrder}`;

      // 1. PRIMERO VERIFICAR CACHÉ
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        // ¡IMPORTANTE! cachedData ya es un objeto, NO usar JSON.parse
        // const response: ApiResponse<any> = JSON.parse(cachedData); // ❌ ESTO ESTÁ MAL
        const response: ApiResponse<any> = cachedData; // ✅ ESTO ES CORRECTO

        console.log('Cache hit for key:', cacheKey);
        res.status(200).json(response);
        return;
      }

      // 2. SI NO HAY CACHÉ, CONSULTAR BASE DE DATOS
      // Construir query de búsqueda - SOLO PRODUCTOS PUBLICADOS
      let query: any = { publish: 'published' };

      // Búsqueda por texto
      if (search) {
        query.$and = [
          { publish: 'published' },
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { sku: { $regex: search, $options: 'i' } },
              { code: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } },
            ],
          },
        ];
      }

      // Filtros de tabla (solo stock, no publish)
      const tableFilters = filters as Omit<IProductTableFilters, 'publish'>;

      if (tableFilters.stock && tableFilters.stock.length > 0) {
        query.inventoryType = { $in: tableFilters.stock };
      }

      // Ejecutar consulta
      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('reviews')
          .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limitNum)
          .exec(),
        Product.countDocuments(query),
      ]);

      const response: ApiResponse<typeof products> = {
        success: true,
        payload: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      };

      // 3. GUARDAR EN CACHÉ PARA FUTURAS CONSULTAS
      // El cacheService.setex ya serializa a JSON automáticamente
      await cacheService.setex(cacheKey, 300, response);

      // 4. ENVIAR RESPUESTA AL CLIENTE
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },
  //
  async searchProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        query = '',
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      const searchTerm = query as string;

      const cacheKey = `products:search:${searchTerm}:page:${pageNum}:limit:${limitNum}`;

      // Verificar caché
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Cache hit for search key:', cacheKey);
        res.status(200).json(cachedData);
        return;
      }

      // Construir query de búsqueda con regex
      let queryConditions: any = { publish: 'published' };

      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm, 'i');
        queryConditions.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { sku: searchRegex },
          { code: searchRegex },
          { category: searchRegex },
        ];
      }

      // Ejecutar búsqueda
      const [products, total] = await Promise.all([
        Product.find(queryConditions)
          .populate('reviews')
          .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limitNum)
          .exec(),
        Product.countDocuments(queryConditions),
      ]);

      const response: ApiResponse<typeof products> = {
        success: true,
        payload: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      };

      // Guardar en caché
      await cacheService.setex(cacheKey, 300, response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  // Obtener un producto publicado por su ID
  async getProductPublishedById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.query;
      const product = await Product.findOne({ productId: id })
        .populate({
          path: 'reviews',
          options: { sort: { postedAt: -1 } },
        })
        .exec();

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        payload: product,
      });
    } catch (error) {
      next(error);
    }
  },
  // Actualiza la contrasenna del usuario autenticado
  async updatePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as IUser)?.id;
      const { oldPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const user = await User.findById(userId).select('+password');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch) {
        res.status(400).json({
          success: false,
          message: 'La contraseña actual es incorrecta',
        });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente',
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, lang } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email es requerido',
        });
        return;
      }

      // Generar token
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      const resetPasswordExpires = new Date(Date.now() + 3600000);

      // Buscar usuario
      const user = await User.findOne({ email });

      if (!user) {
        // Por seguridad, responder igual aunque no exista
        res.json({
          success: true,
          message:
            'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
        });
        return;
      }

      // Actualizar usuario
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpires = resetPasswordExpires;
      await user.save();

      // Determinar URL
      const frontendUrl = process.env.FRONTEND_URL || req.headers.origin;
      const resetUrl = `${frontendUrl}/${lang}/reset-password/${resetToken}`;

      // Enviar email usando el servicio
      const emailService = EmailService.getInstance();
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.profile.username || 'Usuario',
        resetUrl,
        lang || 'es'
      );

      if (!emailSent) {
        console.error(
          `❌ Error crítico: No se pudo enviar email a ${user.email} - Credenciales SMTP incorrectas o servidor no disponible`
        );

        // Opción 1: Informar al usuario (recomendada)
        res.status(500).json({
          success: false,
          message: 'Internal server error, please try again later.',
          code: 'INTERNAL_ERROR',
        });
        return;
      }

      // Responder al cliente (solo si el email se envió correctamente)
      res.json({
        success: true,
        message: 'Password reset instructions.',
      });
    } catch (error) {
      console.error('Error en forgotPassword:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, newPassword, confirmPassword, lang } = req.body;

      // Validación de campos requeridos
      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
        return;
      }

      // Validar que las contraseñas coincidan
      if (confirmPassword && newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
        return;
      }

      // Validar fortaleza de la nueva contraseña
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        res.status(400).json({
          success: false,
          message: passwordValidation.message,
          requirements: passwordValidation.requirements,
        });
        return;
      }

      // Hash del token recibido
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Buscar usuario con token válido
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+password +resetPasswordToken +resetPasswordExpires');

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired token. Please request a new link.',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Validar que la nueva contraseña sea diferente
      try {
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
          res.status(400).json({
            success: false,
            message:
              'The new password must be different from the previous one.',
            code: 'SAME_PASSWORD',
          });
          return;
        }
      } catch (bcryptError) {
        console.error('Error comparando contraseñas:', bcryptError);
      }

      // Actualizar contraseña
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      // Limpiar campos de reset
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.passwordChangedAt = new Date();

      await user.save();

      // Enviar email de confirmación ASÍNCRONO (no esperar)
      const emailService = EmailService.getInstance();
      emailService
        .sendPasswordChangedConfirmation(
          user.email,
          user.profile.username || 'Usuario',
          req,
          lang || 'es'
        )
        .then((success) => {
          if (success) {
            console.log(`Email de confirmación enviado a ${user.email}`);
          } else {
            console.warn(
              `No se pudo enviar email de confirmación a ${user.email}`
            );
          }
        })
        .catch((emailError) => {
          console.error('Error enviando email de confirmación:', emailError);
          // NO fallar la respuesta principal por error de email
        });

      // Responder éxito inmediatamente
      res.json({
        success: true,
        message: 'Password successfully reset',
        payload: {
          userId: user._id,
          email: user.email,
        },
      });
    } catch (error: any) {
      console.error('Error en resetPassword:', error);

      if (error.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          message: 'Data validation error',
          errors: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error, please try again later.',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  },

  async getUserPetStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as IUser)?.id; // Asumiendo que tienes el usuario autenticado en req.user
      const currentDate = new Date();

      // Obtener todas las mascotas del usuario
      const userPets = await Pet.find({ owner: userId });

      // Estadísticas básicas
      const petsCount = userPets.length;

      // Calcular vacunas y mascotas que necesitan vacunación
      let vaccinationsCount = 0;
      let petsNeedingVaccination = 0;
      let vetVisitsCount = 0;

      userPets.forEach((pet) => {
        // Contar vacunas registradas en el historial médico
        if (
          pet.medicalRecord?.vaccines &&
          Array.isArray(pet.medicalRecord.vaccines)
        ) {
          vaccinationsCount += pet.medicalRecord.vaccines.length;

          // Verificar si la mascota necesita vacunación (próxima vacuna en los próximos 30 días)
          const needsVaccination = pet.medicalRecord.vaccines.some(
            (vaccine) => {
              if (vaccine.nextVaccineDate) {
                const nextDate = new Date(vaccine.nextVaccineDate);
                const daysUntilNext = Math.ceil(
                  (nextDate.getTime() - currentDate.getTime()) /
                    (1000 * 3600 * 24)
                );
                return daysUntilNext <= 30 && daysUntilNext > 0;
              }
              return false;
            }
          );

          if (needsVaccination) {
            petsNeedingVaccination++;
          }
        }

        // Contar visitas al veterinario
        if (
          pet.medicalRecord?.datesOfMedicalVisits &&
          Array.isArray(pet.medicalRecord.datesOfMedicalVisits)
        ) {
          vetVisitsCount += pet.medicalRecord.datesOfMedicalVisits.length;
        }
      });

      // Obtener próximas citas (asumiendo que tienes un modelo de Appointment)
      // Si no tienes citas aún, puedes devolver 0 o implementar después
      let appointmentsCount = 0;
      let upcomingAppointments = 0;

      res.json({
        success: true,
        payload: {
          petsCount,
          vaccinationsCount,
          appointmentsCount,
          vetVisitsCount,
          petsNeedingVaccination,
          upcomingAppointments,
          date: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
  async getUserUpcomingAppointments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as IUser)?.id;
      const {
        days = '30',
        includePast = 'false',
        limit = '10',
        petId = '',
      } = req.query as UpcomingAppointmentsQueryParams;

      const daysToConsider = parseInt(days, 10);
      const limitResults = parseInt(limit, 10);
      const includePastAppointments = includePast === 'true';
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + daysToConsider);

      // Construir query base
      const query: any = { owner: userId };
      if (petId) {
        query.memberPetId = petId;
      }

      // Obtener todas las mascotas del usuario
      const userPets = await Pet.find(query).select(
        'memberPetId petName photo medicalRecord'
      );

      const upcomingAppointments: IUpcomingAppointment[] = [];

      // Procesar cada mascota
      for (const pet of userPets) {
        // Procesar vacunas
        if (
          pet.medicalRecord?.vaccines &&
          Array.isArray(pet.medicalRecord.vaccines)
        ) {
          for (const vaccine of pet.medicalRecord.vaccines) {
            if (vaccine.nextVaccineDate) {
              const nextDate = new Date(vaccine.nextVaccineDate);
              const daysUntil = Math.ceil(
                (nextDate.getTime() - currentDate.getTime()) /
                  (1000 * 3600 * 24)
              );

              // Determinar si incluir esta cita
              const isUpcoming = daysUntil >= 0 && daysUntil <= daysToConsider;
              const isOverdue = daysUntil < 0;

              if (isUpcoming || (includePastAppointments && isOverdue)) {
                let status: 'upcoming' | 'overdue' | 'today' = 'upcoming';
                if (daysUntil === 0) status = 'today';
                if (daysUntil < 0) status = 'overdue';

                upcomingAppointments.push({
                  id:
                    vaccine._id?.toString() ||
                    `${pet.memberPetId}_vaccine_${Date.now()}`,
                  petId: pet.memberPetId,
                  petName: pet.petName,
                  petPhoto: pet.photo,
                  type: 'vaccine',
                  title: `${vaccine.vaccineName || 'Vaccine'} - Booster`,
                  description: vaccine.observations || 'Next vaccination due',
                  date: vaccine.nextVaccineDate,
                  time: undefined,
                  location: undefined,
                  veterinarian: undefined,
                  veterinarianPhone: undefined,
                  status,
                  daysUntil,
                  originalRecord: vaccine,
                });
              }
            }
          }
        }

        // Procesar desparasitaciones
        if (
          pet.medicalRecord?.deworming &&
          Array.isArray(pet.medicalRecord.deworming)
        ) {
          for (const deworming of pet.medicalRecord.deworming) {
            if (deworming.nextDewormingDate) {
              const nextDate = new Date(deworming.nextDewormingDate);
              const daysUntil = Math.ceil(
                (nextDate.getTime() - currentDate.getTime()) /
                  (1000 * 3600 * 24)
              );

              const isUpcoming = daysUntil >= 0 && daysUntil <= daysToConsider;
              const isOverdue = daysUntil < 0;

              if (isUpcoming || (includePastAppointments && isOverdue)) {
                let status: 'upcoming' | 'overdue' | 'today' = 'upcoming';
                if (daysUntil === 0) status = 'today';
                if (daysUntil < 0) status = 'overdue';

                upcomingAppointments.push({
                  id:
                    deworming._id?.toString() ||
                    `${pet.memberPetId}_deworming_${Date.now()}`,
                  petId: pet.memberPetId,
                  petName: pet.petName,
                  petPhoto: pet.photo,
                  type: 'deworming',
                  title: `${deworming.dewormerName || 'Deworming'} - Next Dose`,
                  description: deworming.observations || 'Next deworming due',
                  date: deworming.nextDewormingDate,
                  time: undefined,
                  location: undefined,
                  veterinarian: undefined,
                  veterinarianPhone: undefined,
                  status,
                  daysUntil,
                  originalRecord: deworming,
                });
              }
            }
          }
        }

        // Procesar visitas médicas programadas (si tienen fecha futura)
        if (
          pet.medicalRecord?.datesOfMedicalVisits &&
          Array.isArray(pet.medicalRecord.datesOfMedicalVisits)
        ) {
          for (const visit of pet.medicalRecord.datesOfMedicalVisits) {
            if (visit.visitDate) {
              const visitDate = new Date(visit.visitDate);
              const daysUntil = Math.ceil(
                (visitDate.getTime() - currentDate.getTime()) /
                  (1000 * 3600 * 24)
              );

              const isUpcoming = daysUntil >= 0 && daysUntil <= daysToConsider;
              const isOverdue = daysUntil < 0;

              if (isUpcoming || (includePastAppointments && isOverdue)) {
                let status: 'upcoming' | 'overdue' | 'today' = 'upcoming';
                if (daysUntil === 0) status = 'today';
                if (daysUntil < 0) status = 'overdue';

                upcomingAppointments.push({
                  id:
                    visit._id?.toString() ||
                    `${pet.memberPetId}_visit_${Date.now()}`,
                  petId: pet.memberPetId,
                  petName: pet.petName,
                  petPhoto: pet.photo,
                  type: 'medical_visit',
                  title: visit.reasonForVisit || 'Medical Visit',
                  description:
                    visit.observations || 'Scheduled veterinary visit',
                  date: visit.visitDate,
                  time: undefined,
                  location: undefined,
                  veterinarian: visit.veterinarianName,
                  veterinarianPhone: undefined,
                  status,
                  daysUntil,
                  originalRecord: visit,
                });
              }
            }
          }
        }
      }

      // Ordenar por fecha (más cercana primero)
      upcomingAppointments.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();

        // Las de hoy primero, luego las próximas, luego las vencidas
        if (a.status === 'today' && b.status !== 'today') return -1;
        if (b.status === 'today' && a.status !== 'today') return 1;
        if (a.status === 'overdue' && b.status !== 'overdue') return 1;
        if (b.status === 'overdue' && a.status !== 'overdue') return -1;

        return dateA - dateB;
      });

      // Aplicar límite
      const limitedAppointments = upcomingAppointments.slice(0, limitResults);

      // Estadísticas adicionales
      const stats = {
        total: upcomingAppointments.length,
        today: upcomingAppointments.filter((a) => a.status === 'today').length,
        upcoming: upcomingAppointments.filter((a) => a.status === 'upcoming')
          .length,
        overdue: upcomingAppointments.filter((a) => a.status === 'overdue')
          .length,
        byType: {
          vaccine: upcomingAppointments.filter((a) => a.type === 'vaccine')
            .length,
          deworming: upcomingAppointments.filter((a) => a.type === 'deworming')
            .length,
          medical_visit: upcomingAppointments.filter(
            (a) => a.type === 'medical_visit'
          ).length,
        },
      };

      res.json({
        success: true,
        payload: {
          appointments: limitedAppointments,
          stats,
          filters: {
            days: daysToConsider,
            includePast: includePastAppointments,
            limit: limitResults,
            petId: petId || 'all',
          },
          date: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error obteniendo próximas citas del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
  async getUserUpcomingAppointmentsGrouped(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as IUser)?.id;
      const { days = '30', includePast = 'false' } =
        req.query as UpcomingAppointmentsQueryParams;

      const daysToConsider = parseInt(days, 10);
      const includePastAppointments = includePast === 'true';
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + daysToConsider);

      // Obtener todas las mascotas del usuario con sus registros médicos
      const userPets = await Pet.find({ owner: userId }).select(
        'memberPetId petName photo medicalRecord petStatus'
      );

      const petsWithUpcomingAppointments: any[] = [];

      for (const pet of userPets) {
        const petAppointments: IUpcomingAppointment[] = [];

        // Procesar vacunas
        if (pet.medicalRecord?.vaccines) {
          for (const vaccine of pet.medicalRecord.vaccines) {
            if (vaccine.nextVaccineDate) {
              const nextDate = new Date(vaccine.nextVaccineDate);
              const daysUntil = Math.ceil(
                (nextDate.getTime() - currentDate.getTime()) /
                  (1000 * 3600 * 24)
              );

              const isUpcoming = daysUntil >= 0 && daysUntil <= daysToConsider;
              const isOverdue = daysUntil < 0;

              if (isUpcoming || (includePastAppointments && isOverdue)) {
                petAppointments.push({
                  id: vaccine._id?.toString() || '',
                  petId: pet.memberPetId,
                  petName: pet.petName,
                  petPhoto: pet.photo,
                  type: 'vaccine',
                  title: `${vaccine.vaccineName || 'Vaccine'} - Booster`,
                  description: vaccine.observations || 'Next vaccination due',
                  date: vaccine.nextVaccineDate,
                  time: undefined,
                  location: undefined,
                  veterinarian: undefined,
                  veterinarianPhone: undefined,
                  status:
                    daysUntil === 0
                      ? 'today'
                      : daysUntil < 0
                        ? 'overdue'
                        : 'upcoming',
                  daysUntil,
                  originalRecord: vaccine,
                });
              }
            }
          }
        }

        // Procesar desparasitaciones
        if (pet.medicalRecord?.deworming) {
          for (const deworming of pet.medicalRecord.deworming) {
            if (deworming.nextDewormingDate) {
              const nextDate = new Date(deworming.nextDewormingDate);
              const daysUntil = Math.ceil(
                (nextDate.getTime() - currentDate.getTime()) /
                  (1000 * 3600 * 24)
              );

              const isUpcoming = daysUntil >= 0 && daysUntil <= daysToConsider;
              const isOverdue = daysUntil < 0;

              if (isUpcoming || (includePastAppointments && isOverdue)) {
                petAppointments.push({
                  id: deworming._id?.toString() || '',
                  petId: pet.memberPetId,
                  petName: pet.petName,
                  petPhoto: pet.photo,
                  type: 'deworming',
                  title: `${deworming.dewormerName || 'Deworming'} - Next Dose`,
                  description: deworming.observations || 'Next deworming due',
                  date: deworming.nextDewormingDate,
                  time: undefined,
                  location: undefined,
                  veterinarian: undefined,
                  veterinarianPhone: undefined,
                  status:
                    daysUntil === 0
                      ? 'today'
                      : daysUntil < 0
                        ? 'overdue'
                        : 'upcoming',
                  daysUntil,
                  originalRecord: deworming,
                });
              }
            }
          }
        }

        // Ordenar citas de esta mascota por fecha
        petAppointments.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (a.status === 'today' && b.status !== 'today') return -1;
          if (b.status === 'today' && a.status !== 'today') return 1;
          return dateA - dateB;
        });

        if (petAppointments.length > 0) {
          petsWithUpcomingAppointments.push({
            petId: pet.memberPetId,
            petName: pet.petName,
            petPhoto: pet.photo,
            petStatus: pet.petStatus,
            totalAppointments: petAppointments.length,
            appointments: petAppointments,
          });
        }
      }

      // Ordenar mascotas por la fecha de su próxima cita
      petsWithUpcomingAppointments.sort((a, b) => {
        const nextDateA = new Date(a.appointments[0]?.date).getTime();
        const nextDateB = new Date(b.appointments[0]?.date).getTime();
        return nextDateA - nextDateB;
      });

      res.json({
        success: true,
        payload: {
          pets: petsWithUpcomingAppointments,
          totalPets: petsWithUpcomingAppointments.length,
          totalAppointments: petsWithUpcomingAppointments.reduce(
            (sum, pet) => sum + pet.totalAppointments,
            0
          ),
          date: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error obteniendo próximas citas agrupadas:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
  // En tu controlador de pets (pet.controller.ts)

  registerPetView: async (req: Request, res: Response): Promise<void> => {
    try {
      const { memberPetId } = req.params;
      const { lat, lng } = req.body;

      if (!memberPetId) {
        res.status(400).json({
          success: false,
          message: 'memberPetId is required',
        });
        return;
      }

      if (!lat || !lng) {
        res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
        return;
      }

      // Buscar la mascota por memberPetId
      const pet = await Pet.findOne({ memberPetId });

      if (!pet) {
        res.status(404).json({
          success: false,
          message: 'Pet not found',
        });
        return;
      }

      // Agregar la vista al petViewCounter
      const newView = {
        lat: lat.toString(),
        lng: lng.toString(),
        dateViewed: new Date().toISOString(),
      };

      pet.petViewCounter = pet.petViewCounter || [];
      pet.petViewCounter.push(newView);

      await pet.save();

      res.status(200).json({
        success: true,
        message: 'Pet view registered successfully',
        data: {
          viewCount: pet.petViewCounter.length,
        },
      });
    } catch (error) {
      console.error('Error registering pet view:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  },
};

export default userCtl;
