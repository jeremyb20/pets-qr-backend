import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import User, { IUser } from '../models/User.model';
import Pet, { IPet } from '../models/Pet.model';
import fs from 'fs-extra';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import {
  ApiResponse,
  ErrorResponse,
  MedicalRecordQueryParams,
  PetFilters,
  PetQueryParams,
  SuccessResponse,
} from '../types/response.type';
import {
  isDewormingInput,
  isMedicalVisitInput,
  isVaccineInput,
  MedicalRecordInput,
  MedicalRecordResponse,
  PetProfile,
} from '../types/pet.types';
import QrCode from '../models/QrCode.model';
import { Types } from 'mongoose';

const cloudinaryV2 = cloudinary.v2;

// Interfaces para los tipos
interface UserResponse {
  success: boolean;
  msg?: string;
  message?: string;
  payload?: any;
  token?: string;
  error?: any;
}

interface AuthRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  phone: string;
  isActivated: boolean;
  password: string;
  country: string;
  userState: number;
}

interface EditProfileRequest {
  _id: string;
  address?: string;
  birthDate?: string;
  favoriteActivities?: string;
  healthAndRequirements?: string;
  ownerPetName?: string;
  phoneVeterinarian?: string;
  veterinarianContact?: string;
  petName?: string;
  petStatus?: string;
  genderSelected?: string;
  race?: string;
  weight?: string;
  country?: string;
}

interface UserController {
  authenticateLegacy(req: Request, res: Response): Promise<void>;
  authenticate(req: Request, res: Response): Promise<void>;
  me(req: Request, res: Response): Promise<void>;
  getUserProfileById(req: Request, res: Response): Promise<void>;
  updatePetById(req: Request, res: Response): Promise<void>;
  getUserProfileByIdScanner(req: Request, res: Response): Promise<void>;
  getProfileById(req: Request, res: Response): Promise<void>;
  getMedicalRecordsByPet(req: Request, res: Response): Promise<void>;
  createMedicalRecord(req: Request, res: Response): Promise<void>;
  updateMedicalRecord(req: Request, res: Response): Promise<void>;
  getMyPetCode(req: Request, res: Response): Promise<void>;
  getMyPetInfo(req: Request, res: Response): Promise<void>;
  getAllPetsByUser(req: Request, res: Response): Promise<void>;
  updateMyProfile(req: Request, res: Response): Promise<void>;
  editProfileInfo(req: Request, res: Response): Promise<void>;
  editPetProfile(req: Request, res: Response): Promise<void>;
  editPhotoProfile(req: Request, res: Response): Promise<void>;
  editThemeProfile(req: Request, res: Response): Promise<void>;
  updatePetViewed(req: Request, res: Response): Promise<void>;
  registerNewPet(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  registerNewPetByQRcode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  registerNewPetfromUserProfile(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  deletePetById(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  forgot(req: Request, res: Response, next?: NextFunction): Promise<void>;
  resetPassword(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
}

const userCtl: UserController = {
  authenticateLegacy: async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as AuthRequest;

    (User as any).getUserByUsername(email, (err: any, pet: IUser) => {
      if (err) throw err;
      if (!pet) {
        res.json({ success: false, msg: 'Email not found' });
        return;
      }

      pet.comparePassword(
        password,
        (err: any, isMatch: boolean | undefined) => {
          if (err) throw err;
          if (isMatch) {
            const token = jwt.sign(
              { data: pet.email, id: pet._id },
              process.env.SECRET as string,
              {
                expiresIn: 86400,
              }
            );
            res.json({
              success: true,
              token: 'JWT ' + token,
              payload: {
                id: pet._id,
                userState: (pet as any).userState,
                email: pet.email,
                theme: (pet as any).theme,
              },
            });
          } else {
            res.json({ success: false, msg: 'Wrong password' });
          }
        }
      );
    });
  },

  authenticate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as AuthRequest;
      const user = await User.findOne({ email });
      if (!user) {
        res.json({ success: false, msg: 'Email not found' });
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
        res.json({ success: false, msg: 'Wrong password' });
      }
    } catch (error) {
      console.error('Error in authenticate method:', error);
      res.status(500).json({ success: false, msg: 'Internal server error' });
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (await User.findById((req as any).user?.id)) as IUser;
      if (!user) {
        res.status(404).send({
          success: false,
          msg: 'User not found',
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
        msg: 'Internal server error',
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
         race 
         favoriteActivities 
         healthAndRequirements 
         address 
         phoneVeterinarian 
         veterinarianContact
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
      const payload: PetProfile[] = (userWithPets?.pets || []).map(
        (pet: any) => ({
          _id: pet._id.toString(),
          idParental: id,
          petName: pet.petName || '',
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
          race: pet.race || '',
          weight: pet.weight || '',
          genderSelected: pet.genderSelected || '',
          favoriteActivities: pet.favoriteActivities || '',
          healthAndRequirements: pet.healthAndRequirements || '',
          address: pet.address || '',
          memberPetId: pet.memberPetId || '',
        })
      );

      const response: ApiResponse<PetProfile[]> = {
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

      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while fetching user pets.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },

  getProfileById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Buscar en el modelo Pet por memberPetId
      const pet = await Pet.findOne({ memberPetId: id }).select(
        // 'petName photo phone genderSelected weight race birthDate petStatus memberPetId owner permissions petViewCounter isDigitalIdentificationActive createdAt updatedAt favoriteActivities healthAndRequirements '
        ' memberPetId petName genderSelected race weight petStatus birthDate favoriteActivities healthAndRequirements phoneVeterinarian veterinarianContact photo  address lat lng linkTwitter linkFacebook linkInstagram isDigitalIdentificationActive  petViewCounter  permissions  petStatusReport  createdAt updatedAt  phone ownerPetName'
      );

      // Si se encuentra la mascota (QR ya convertido en perfil)
      if (pet) {
        // Buscar el usuario por separado
        const user = await User.findById(pet.owner)
          .select('username email profile')
          .lean();

        // Convertir el documento de Mongoose a objeto plano
        const petObject = pet.toObject ? pet.toObject() : pet;

        // Combinar los datos de forma correcta
        const petWithOwner = {
          ...petObject,
          owner: user
            ? {
                _id: user._id,
                username: user.profile?.username || '',
                email: user.email,
                // Extraer solo los campos específicos del profile que necesitas
                name: user.profile?.name || '',
                phone: user.profile?.phone || '',
                address: user.profile?.address || '',
                city: user.profile?.city || '',
                state: user.profile?.state || '',
                country: user.profile?.country || '',
                photoProfile: user.profile?.photoProfile || '',
                // Agrega otros campos específicos del profile que necesites
              }
            : null,
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
        msg: 'Código o mascota no encontrada',
        type: 'not_found',
      });
    } catch (error) {
      console.error('Error in getProfileById:', error);
      res.status(500).json({
        success: false,
        msg: 'Ocurrió un error al buscar la información.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
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

      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while fetching medical records.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
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

      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while creating the medical record',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
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

      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while updating the medical record',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },

  updatePetById: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        petName,
        petStatus,
        phone,
        ownerPetName,
        birthDate,
        phoneVeterinarian,
        veterinarianContact,
        photo,
        lat,
        lng,
        isDigitalIdentificationActive,
        permissions,
        petStatusReport,
        petViewCounter,
        photo_id,
        id,
        weight,
        genderSelected,
        address,
        favoriteActivities,
        healthAndRequirements,
        race,
      } = req.body;

      const pet = await Pet.findById(id);

      if (!pet) {
        res.status(404).json({
          success: false,
          msg: 'Pet not found',
        });
        return;
      }

      const updateData = {
        petName,
        petStatus,
        phone,
        ownerPetName,
        birthDate,
        phoneVeterinarian,
        veterinarianContact,
        photo,
        lat,
        lng,
        isDigitalIdentificationActive,
        permissions,
        petStatusReport,
        petViewCounter,
        photo_id,
        weight,
        genderSelected,
        address,
        favoriteActivities,
        healthAndRequirements,
        race,
        updatedAt: new Date(),
      } as unknown as IPet;

      Object.keys(updateData).forEach((key) => {
        if ((updateData as any)[key] === undefined) {
          delete (updateData as any)[key];
        }
      });

      await Pet.findByIdAndUpdate(id, updateData);

      res.status(200).json({
        success: true,
        msg: 'The information was updated correctly',
      });
    } catch (error) {
      console.error('Error in updatePetById:', error);
      res.status(500).json({
        success: false,
        msg: 'An error occurred while updating pet.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  },

  updateMyProfile: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
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
    } = req.body;
    const id = (req as any).user?.id;

    try {
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
        msg: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while updating user.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },

  getUserProfileById: async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById({ _id: req.query.id });
    if (user) {
      const userData = {
        address: (user as any).address,
        birthDate: (user as any).birthDate,
        favoriteActivities: (user as any).favoriteActivities,
        healthAndRequirements: (user as any).healthAndRequirements,
        ownerPetName: (user as any).ownerPetName,
        phoneVeterinarian: (user as any).phoneVeterinarian,
        veterinarianContact: (user as any).veterinarianContact,
        email: user.email,
        petName: (user as any).petName,
        petStatus: (user as any).petStatus,
        photo: (user as any).photo,
        photo_id: (user as any).photo_id,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
        newPetProfile: (user as any).newPetProfile,
        genderSelected: (user as any).genderSelected,
        _id: user._id,
        race: (user as any).race,
        weight: (user as any).weight,
        phone: user.profile.phone,
        country: user.profile.country,
      };
      res.status(200).send({
        success: true,
        payload: userData,
      });
    } else {
      res.status(200).send({ success: false, msg: 'User not found' });
    }
  },

  getUserProfileByIdScanner: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { idPrimary, idSecondary } = req.params;
      const user = await User.findById({ _id: idPrimary });
      if (user) {
        if (!user.isActivated) {
          if (idSecondary == '0') {
            const { photo, petName } = user as any;
            res
              .status(200)
              .send({ success: true, payload: { photo, petName } });
          } else {
            const data = (user as any).newPetProfile.find(
              (x: any) => x._id == idSecondary
            );
            if (data) {
              const userReceived = {
                petName: data.petName,
                photo: data.photo,
              };
              res.status(200).send({ success: true, payload: userReceived });
            } else {
              res.status(200).send({ success: false, msg: 'User not found' });
            }
          }
        } else {
          res.status(200).send({ success: false, msg: 'User not found' });
        }
      } else {
        res.status(200).send({ success: false, msg: 'User not found' });
      }
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  getMyPetCode: async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById({ _id: req.query.id });
    if (user) {
      const qrCode = {
        isActivated: user.isActivated,
        _id: user._id,
      };
      if (user.isActivated) {
        const data = qrCode;
        res.status(200).send({ success: true, payload: data });
      } else {
        if (req.query.idSecond != '0') {
          const data = (user as any).newPetProfile.find(
            (x: any) => x._id == req.query.idSecond
          );
          res.status(200).send({ success: true, payload: data });
        } else {
          const userData = {
            phone: user.profile.phone,
            _id: user._id,
            photo: (user as any).photo,
            address: (user as any).address,
            birthDate: (user as any).birthDate,
            favoriteActivities: (user as any).favoriteActivities,
            healthAndRequirements: (user as any).healthAndRequirements,
            ownerPetName: (user as any).ownerPetName,
            phoneVeterinarian: (user as any).phoneVeterinarian,
            veterinarianContact: (user as any).veterinarianContact,
            petName: (user as any).petName,
            petStatus: (user as any).petStatus,
            genderSelected: (user as any).genderSelected,
            isDigitalIdentificationActive: (user as any)
              .isDigitalIdentificationActive,
            race: (user as any).race,
            weight: (user as any).weight,
          };
          res.status(200).send({
            success: true,
            payload: userData,
          });
        }
      }
    } else {
      res.status(200).send({ success: false, msg: 'User not found' });
    }
  },

  getMyPetInfo: async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById({ _id: req.query.id });
    if (user) {
      const qrCode = {
        isActivated: user.isActivated,
        _id: user._id,
      };
      if (user.isActivated) {
        const data = qrCode;
        res.status(200).send({ success: true, payload: data });
      } else {
        const petInfo = (user as any).newPetProfile[req.query.idSecond as any];
        res.status(200).send({
          success: petInfo ? true : false,
          payload: petInfo ? petInfo : null,
          msg: petInfo ? '' : 'User not found',
        });
      }
    } else {
      res.status(200).send({ success: false, msg: 'User not found' });
    }
  },

  editProfileInfo: async (req: Request, res: Response): Promise<void> => {
    const {
      address,
      birthDate,
      favoriteActivities,
      healthAndRequirements,
      ownerPetName,
      phoneVeterinarian,
      veterinarianContact,
      petName,
      petStatus,
      genderSelected,
      race,
      weight,
      country,
    } = req.body as EditProfileRequest;

    try {
      await User.findByIdAndUpdate(req.body._id, {
        address,
        birthDate,
        favoriteActivities,
        healthAndRequirements,
        ownerPetName,
        phoneVeterinarian,
        veterinarianContact,
        petName,
        petStatus,
        genderSelected,
        race,
        weight,
        country,
      });
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  editPetProfile: async (req: Request, res: Response): Promise<void> => {
    const {
      address,
      birthDate,
      favoriteActivities,
      healthAndRequirements,
      ownerPetName,
      phoneVeterinarian,
      veterinarianContact,
      petName,
      petStatus,
      genderSelected,
      phone,
      race,
      weight,
      country,
    } = req.body;

    try {
      await User.findOneAndUpdate(
        { _id: req.body._id, 'newPetProfile._id': req.body.secondaryId },
        {
          $set: {
            'newPetProfile.$.address': address,
            'newPetProfile.$.birthDate': birthDate,
            'newPetProfile.$.favoriteActivities': favoriteActivities,
            'newPetProfile.$.healthAndRequirements': healthAndRequirements,
            'newPetProfile.$.ownerPetName': ownerPetName,
            'newPetProfile.$.phoneVeterinarian': phoneVeterinarian,
            'newPetProfile.$.veterinarianContact': veterinarianContact,
            'newPetProfile.$.petName': petName,
            'newPetProfile.$.petStatus': petStatus,
            'newPetProfile.$.genderSelected': genderSelected,
            'newPetProfile.$.phone': phone,
            'newPetProfile.$.race': race,
            'newPetProfile.$.weight': weight,
            'newPetProfile.$.country': country,
          },
        }
      );
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  editPhotoProfile: async (req: Request, res: Response): Promise<void> => {
    const { idPrincipal, idSecondary, idPhoto } = req.body;

    const result = await cloudinaryV2.uploader.upload(
      req.file != undefined ? (req.file as any).path : req.body.image,
      { folder: 'mascotas_cr' }
    );

    try {
      if (idSecondary === '0') {
        if (idPhoto != undefined) {
          await cloudinaryV2.uploader.destroy(idPhoto);
        }
        await User.findByIdAndUpdate(idPrincipal, {
          photo: result.secure_url,
          photo_id: result.public_id,
        });
        await fs.unlink((req.file as any).path);
      } else {
        if (idPhoto != undefined) {
          await cloudinaryV2.uploader.destroy(idPhoto);
        }
        await User.findOneAndUpdate(
          { _id: idPrincipal, 'newPetProfile._id': idSecondary },
          {
            $set: {
              'newPetProfile.$.photo': result.secure_url,
              'newPetProfile.$.photo_id': result.public_id,
            },
          }
        );
        await fs.unlink((req.file as any).path);
      }
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  editThemeProfile: async (req: Request, res: Response): Promise<void> => {
    const { theme } = req.body;
    try {
      await User.findByIdAndUpdate(req.body._id, { theme });
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  updatePetViewed: async (req: Request, res: Response): Promise<void> => {
    const { lat, lng, dateViewed } = req.body;
    try {
      const data = { lat, lng, dateViewed };
      await User.findOneAndUpdate(
        { _id: req.body._id, 'newPetProfile._id': req.body.secondaryId },
        {
          $push: {
            'newPetProfile.$.petViewCounter': data,
          },
        },
        { new: true }
      );
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  // Los métodos restantes (registerNewPet, registerNewPetByQRcode, etc.)
  // seguirían el mismo patrón de conversión...

  registerNewPet: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    const { email, phone, isActivated, password, country, userState } =
      req.body;
    const emailFound = await User.findOne({ email: email });
    if (emailFound) {
      res.json({
        success: false,
        msg: 'The email already exists in the system',
      });
      return;
    } else {
      try {
        const newPet = new Pet({
          email,
          phone,
          country,
          isActivated,
          password,
          userState,
          hostName: req.headers.referer,
          newPetProfile: [],
          // theme: 'theme-default-light',
          theme: 'dark',
        });

        // User.addPet(newPet, async (_err, pPet, _done) => {
        //   try {
        //     var smtpTransport = nodemailer.createTransport({
        //       host: process.env.ZOHO_HOST,
        //       port: process.env.ZOHO_PORT,
        //       secure: true,
        //       logger: true,
        //       debug: true,
        //       auth: {
        //         user: process.env.ZOHO_USER,
        //         pass: process.env.ZOHO_PASSWORD,
        //       },
        //       tls: {
        //         // do not fail on invalid certs
        //         rejectUnauthorized: false,
        //       },
        //     });

        //     const handlebarOptions = {
        //       viewEngine: {
        //         extName: '.handlebars',
        //         partialsDir: path.resolve(__dirname, 'views'),
        //         defaultLayout: false,
        //       },
        //       viewPath: path.resolve(__dirname, 'views'),
        //       extName: '.handlebars',
        //     };

        //     smtpTransport.use('compile', hbs(handlebarOptions));

        //     smtpTransport.verify(function (error, success) {
        //       if (error) {
        //         console.log(error);
        //       } else {
        //         console.log('Server is ready to take our messages');
        //       }
        //     });

        //     var mailOptions = {
        //       to: email,
        //       from: 'soporte@localpetsandfamily.com',
        //       subject: 'Registro Exitoso en Plaquitas para mascotas CR',
        //       template: 'email-new-pet',
        //       context: {
        //         text1: 'Hola \n\n',
        //         text2:
        //           '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
        //         text3:
        //           'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n',
        //         email: email,
        //         text4:
        //           'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
        //         text5:
        //           'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
        //         text6:
        //           'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
        //         text7: '¡Bienvenido a bordo! ',
        //         text8: 'Atentamente,',
        //         text9: 'El Equipo de Plaquitas para mascotas CR',
        //         textLink: 'Iniciar Sesión',
        //         link:
        //           req.headers.host == 'localhost:8080'
        //             ? 'http://localhost:4200/login-pets'
        //             : req.headers.referer + '/login',
        //       },
        //     };

        //     smtpTransport.sendMail(mailOptions, function (err) {
        //       res.json({
        //         success: true,
        //         msg: 'Your pet has been created successfully.',
        //       });
        //     });
        //   } catch (error) {
        //     res.json({
        //       success: false,
        //       msg: 'The email already exists in the system',
        //       error: JSON.parse(JSON.stringify(error)),
        //     });
        //     next(error);
        //   }
        // });

        try {
          var smtpTransport = nodemailer.createTransport({
            // host: process.env.ZOHO_HOST, // Need improvement here
            // port: process.env.ZOHO_PORT,
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            logger: true,
            debug: true,
            auth: {
              user: process.env.ZOHO_USER,
              pass: process.env.ZOHO_PASSWORD,
            },
            tls: {
              // do not fail on invalid certs
              rejectUnauthorized: false,
            },
          });

          const handlebarOptions = {
            viewEngine: {
              extname: '.handlebars',
              partialsDir: path.resolve(__dirname, 'views'),
              defaultLayout: false,
            },
            viewPath: path.resolve(__dirname, 'views'),
            extName: '.handlebars',
          } as any;

          smtpTransport.use('compile', hbs(handlebarOptions));

          smtpTransport.verify(function (error, success) {
            if (error) {
              console.log(error);
            } else {
              console.log('Server is ready to take our messages');
            }
          });

          var mailOptions = {
            to: email,
            from: 'soporte@localpetsandfamily.com',
            subject: 'Registro Exitoso en Plaquitas para mascotas CR',
            template: 'email-new-pet',
            context: {
              text1: 'Hola \n\n',
              text2:
                '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
              text3:
                'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n',
              email: email,
              text4:
                'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
              text5:
                'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
              text6:
                'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
              text7: '¡Bienvenido a bordo! ',
              text8: 'Atentamente,',
              text9: 'El Equipo de Plaquitas para mascotas CR',
              textLink: 'Iniciar Sesión',
              link:
                req.headers.host == 'localhost:8080'
                  ? 'http://localhost:4200/login-pets'
                  : req.headers.referer + '/login',
            },
          };

          smtpTransport.sendMail(mailOptions, function (err) {
            res.json({
              success: true,
              msg: 'Your pet has been created successfully.',
            });
          });
        } catch (error) {
          res.json({
            success: false,
            msg: 'The email already exists in the system',
            error: JSON.parse(JSON.stringify(error)),
          });
          if (next) next(error);
        }
      } catch (error) {
        res.json({
          success: false,
          msg: 'An error occurred in the process.',
          error: JSON.parse(JSON.stringify(error)),
        });
      }
    }
  },

  registerNewPetByQRcode: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    // Implementación similar a los métodos anteriores...
    //   const code = await User.findById({ _id: req.body._id });
    //   if (code.randomCode === req.body.codeGenerator) {
    //     const emailFound = await User.findOne({ email: req.body.email });
    //     if (emailFound) {
    //       res.json({
    //         success: false,
    //         msg: 'The email already exists in the system',
    //       });
    //     } else {
    //       try {
    //         const { email, userState, phone, isActivated, password, _id, country } =
    //           req.body;
    //         const newPet = {
    //           _id,
    //           email,
    //           userState,
    //           password,
    //           isActivated,
    //           phone,
    //           country,
    //           theme: 'theme-default-light',
    //         };
    //         User.newPetGeneratorCode(newPet, async (_err, pPet, _done) => {
    //           await User.findByIdAndUpdate(pPet._id, {
    //             email: pPet.email,
    //             password: pPet.password,
    //             userState: pPet.userState,
    //             isActivated: pPet.isActivated,
    //             phone: pPet.phone,
    //             country: pPet.country,
    //             newPetProfile: [],
    //           })
    //             .then(async function (data, err) {
    //               try {
    //                 await fs.unlink(req.file.path);
    //                 var smtpTransport = nodemailer.createTransport({
    //                   host: process.env.ZOHO_HOST,
    //                   port: process.env.ZOHO_PORT,
    //                   secure: true,
    //                   logger: true,
    //                   debug: true,
    //                   auth: {
    //                     user: process.env.ZOHO_USER,
    //                     pass: process.env.ZOHO_PASSWORD,
    //                   },
    //                   tls: {
    //                     // do not fail on invalid certs
    //                     rejectUnauthorized: false,
    //                   },
    //                 });
    //                 const handlebarOptions = {
    //                   viewEngine: {
    //                     extName: '.handlebars',
    //                     partialsDir: path.resolve(__dirname, 'views'),
    //                     defaultLayout: false,
    //                   },
    //                   viewPath: path.resolve(__dirname, 'views'),
    //                   extName: '.handlebars',
    //                 };
    //                 smtpTransport.use('compile', hbs(handlebarOptions));
    //                 smtpTransport.verify(function (error, success) {
    //                   if (error) {
    //                     console.log(error);
    //                   } else {
    //                     console.log('Server is ready to take our messages');
    //                   }
    //                 });
    //                 var mailOptions = {
    //                   to: email,
    //                   from: 'soporte@localpetsandfamily.com',
    //                   subject: 'Registro Exitoso en Plaquitas para mascotas CR',
    //                   template: 'email-new-pet',
    //                   context: {
    //                     text1: 'Hola \n\n',
    //                     text2:
    //                       '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
    //                     text3:
    //                       'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n',
    //                     email: email,
    //                     text4:
    //                       'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
    //                     text5:
    //                       'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
    //                     text6:
    //                       'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
    //                     text7: '¡Bienvenido a bordo! ',
    //                     text8: 'Atentamente,',
    //                     text9: 'El Equipo de Plaquitas para mascotas CR',
    //                     textLink: 'Iniciar Sesión',
    //                     link:
    //                       req.headers.host == 'localhost:8080'
    //                         ? 'http://localhost:4200/login-pets'
    //                         : req.headers.referer + '/login',
    //                   },
    //                 };
    //                 smtpTransport.sendMail(mailOptions, function (err) {
    //                   res.json({
    //                     success: true,
    //                     msg: 'Your pet has been created successfully.',
    //                   });
    //                 });
    //               } catch (error) {
    //                 res.json({
    //                   success: false,
    //                   msg: 'An error occurred in the process.',
    //                   error: JSON.parse(JSON.stringify(error)),
    //                 });
    //                 next(error);
    //               }
    //             })
    //             .catch((error) => {
    //               res.json({
    //                 success: false,
    //                 msg: 'An error occurred in the process.',
    //                 error: JSON.parse(JSON.stringify(error)),
    //               });
    //             });
    //         });
    //       } catch (error) {
    //         res.json({
    //           success: false,
    //           msg: 'An error occurred in the process.',
    //           error: JSON.parse(JSON.stringify(error)),
    //         });
    //       }
    //     }
    //   } else {
    //     await fs.unlink(req.file.path);
    //     res.json({ success: false, msg: 'Invalid code' });
    //   }
  },

  registerNewPetfromUserProfile: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    // Implementación similar a los métodos anteriores...
    //   const {
    //     genderSelected,
    //     petName,
    //     petStatus,
    //     email,
    //     phone,
    //     ownerPetName,
    //     address,
    //     birthDate,
    //     favoriteActivities,
    //     healthAndRequirements,
    //     phoneVeterinarian,
    //     veterinarianContact,
    //     country,
    //   } = req.body;
    //   try {
    //     const result = await cloudinary.uploader.upload(
    //       req.file != undefined ? req.file.path : req.body.photo,
    //       { folder: 'mascotas_cr' }
    //     );
    //     const permissions = {
    //       showPhoneInfo: true,
    //       showEmailInfo: true,
    //       showLinkTwitter: true,
    //       showLinkFacebook: true,
    //       showLinkInstagram: true,
    //       showOwnerPetName: true,
    //       showBirthDate: true,
    //       showAddressInfo: true,
    //       showAgeInfo: true,
    //       showVeterinarianContact: true,
    //       showPhoneVeterinarian: true,
    //       showHealthAndRequirements: true,
    //       showFavoriteActivities: true,
    //       showLocationInfo: true,
    //     };
    //     const newPet = {
    //       genderSelected,
    //       petName,
    //       petStatus,
    //       email,
    //       phone,
    //       ownerPetName,
    //       address,
    //       birthDate,
    //       favoriteActivities,
    //       healthAndRequirements,
    //       phoneVeterinarian,
    //       veterinarianContact,
    //       country,
    //       photo: result.secure_url,
    //       photo_id: result.public_id,
    //       permissions: permissions,
    //     };
    //     await User.findByIdAndUpdate(
    //       req.body._id,
    //       { $push: { newPetProfile: newPet } },
    //       { new: true }
    //     ).then(async function (data) {
    //       await fs.unlink(req.file.path);
    //       res.json({
    //         success: true,
    //         msg: 'Your pet has been created successfully.',
    //       });
    //     });
    //   } catch (error) {
    //     res.json({
    //       success: false,
    //       msg: 'An error occurred in the process.',
    //       error: JSON.parse(JSON.stringify(error)),
    //     });
    //   }
  },

  deletePetById: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    // Implementación similar a los métodos anteriores...
    //   try {
    //     await User.findByIdAndUpdate(req.body.idPrimary, {
    //       $pull: { newPetProfile: { _id: req.body._id } },
    //     }).then(async function (data) {
    //       await cloudinary.uploader.destroy(req.body.photo_id);
    //       res.json({
    //         success: true,
    //         msg: 'Your pet has been deleted successfully.',
    //       });
    //     });
    //   } catch (error) {
    //     res.json({
    //       success: false,
    //       msg: 'An error occurred in the process.',
    //       error: JSON.parse(JSON.stringify(error)),
    //     });
    //   }
  },

  forgot: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    // Implementación similar a los métodos anteriores...
    //   const { email } = req.body;
    //   async.waterfall(
    //     [
    //       function (done) {
    //         crypto.randomBytes(20, function (err, buf) {
    //           var token = buf.toString('hex');
    //           done(err, token);
    //         });
    //       },
    //       function (token, done) {
    //         User.findOne({ email: email }, (err, user) => {
    //           if (!user) {
    //             return res.json({ success: false, msg: 'Email not found' });
    //           }
    //           if (user != null) {
    //             user.resetPasswordToken = token;
    //             user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    //             user.save(function (err) {
    //               done(err, token, user);
    //             });
    //           }
    //         });
    //       },
    //       function (token, user, done) {
    //         var smtpTransport = nodemailer.createTransport({
    //           host: process.env.ZOHO_HOST,
    //           port: process.env.ZOHO_PORT,
    //           secure: true,
    //           logger: true,
    //           debug: true,
    //           auth: {
    //             user: process.env.ZOHO_USER,
    //             pass: process.env.ZOHO_PASSWORD,
    //           },
    //           tls: {
    //             // do not fail on invalid certs
    //             rejectUnauthorized: false,
    //           },
    //         });
    //         const handlebarOptions = {
    //           viewEngine: {
    //             extName: '.handlebars',
    //             partialsDir: path.resolve(__dirname, 'views'),
    //             defaultLayout: false,
    //           },
    //           viewPath: path.resolve(__dirname, 'views'),
    //           extName: '.handlebars',
    //         };
    //         smtpTransport.use('compile', hbs(handlebarOptions));
    //         smtpTransport.verify(function (error, success) {
    //           if (error) {
    //             console.log(error);
    //           } else {
    //             console.log('Server is ready to take our messages');
    //           }
    //         });
    //         var mailOptions = {
    //           to: user.email,
    //           from: '	soporte@localpetsandfamily.com',
    //           subject:
    //             'Plaquitas para mascotas CR restablecimiento de la contraseña',
    //           template: 'email-forgot',
    //           context: {
    //             text1: 'Estimado usuario, \n\n',
    //             text2:
    //               'Recibe este correo electrónico porque usted, o alguien en su representación, ha solicitado restablecer la contraseña de su cuenta.',
    //             text3:
    //               'Para completar este proceso, por favor haga clic en el enlace proporcionado a continuación o cópielo y péguelo en su navegador:\n\n',
    //             linkSend:
    //               req.headers.referer + '/reset-password/' + token + ' \n\n',
    //             text4:
    //               'Si usted no solicitó este restablecimiento de contraseña, le pedimos que por favor ignore este correo electrónico. En tal caso, su contraseña seguirá siendo la misma y segura.\n\n',
    //             text5:
    //               'Gracias por utilizar nuestros servicios y por mantener su cuenta segura.\n\n',
    //             text6: 'Atentamente.\n\n',
    //             text7: 'Plaquitas para mascotas CR',
    //             textLink: 'Ir al enlace',
    //             link:
    //               req.headers.host == 'localhost:8080'
    //                 ? 'http://localhost:4200/reset-password/' + token
    //                 : req.headers.referer + '/reset-password/' + token,
    //           },
    //         };
    //         smtpTransport.sendMail(mailOptions, function (err) {
    //           res.json({
    //             success: true,
    //             msg:
    //               'Se ha enviado un correo electrónico a ' +
    //               user.email +
    //               ' con más instrucciones. favor de revisar la carpeta de spam si no ves el correo en tu bandeja principal',
    //           });
    //           done(err, 'done');
    //         });
    //       },
    //     ],
    //     function (err) {
    //       res.json({
    //         success: false,
    //         msg: 'An error occurred in the process.',
    //         error: JSON.parse(JSON.stringify(err)),
    //       });
    //     }
    //   );
  },

  resetPassword: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    // Implementación similar a los métodos anteriores...
    //   req.params.token = req.body.token;
    //   const { token, password } = req.body;
    //   async.waterfall(
    //     [
    //       function (done) {
    //         User.findOne(
    //           {
    //             resetPasswordToken: token,
    //             resetPasswordExpires: { $gt: Date.now() },
    //           },
    //           function (err, user) {
    //             if (!user) {
    //               return res.json({
    //                 success: false,
    //                 msg: 'El token de restablecimiento de contraseña no es válido o ha caducado..',
    //               });
    //             } else {
    //               user.password = password;
    //               user.resetPasswordToken = undefined;
    //               user.resetPasswordExpires = undefined;
    //               bcrypt.genSalt(10, function (err, salt) {
    //                 if (err) return next(err);
    //                 bcrypt.hash(user.password, salt, function (err, hash) {
    //                   if (err) return next(err);
    //                   user.password = hash;
    //                   user.save(function (err) {
    //                     done(err, user);
    //                   });
    //                 });
    //               });
    //             }
    //           }
    //         );
    //       },
    //       function (user, done) {
    //         var smtpTransport = nodemailer.createTransport({
    //           host: process.env.ZOHO_HOST,
    //           port: process.env.ZOHO_PORT,
    //           secure: true,
    //           logger: true,
    //           debug: true,
    //           auth: {
    //             user: process.env.ZOHO_USER,
    //             pass: process.env.ZOHO_PASSWORD,
    //           },
    //           tls: {
    //             // do not fail on invalid certs
    //             rejectUnauthorized: false,
    //           },
    //         });
    //         const handlebarOptions = {
    //           viewEngine: {
    //             extName: '.handlebars',
    //             partialsDir: path.resolve(__dirname, 'views'),
    //             defaultLayout: false,
    //           },
    //           viewPath: path.resolve(__dirname, 'views'),
    //           extName: '.handlebars',
    //         };
    //         smtpTransport.use('compile', hbs(handlebarOptions));
    //         smtpTransport.verify(function (error, success) {
    //           if (error) {
    //             console.log(error);
    //           } else {
    //             console.log('Server is ready to take our messages');
    //           }
    //         });
    //         var mailOptions = {
    //           to: user.email,
    //           from: '	soporte@localpetsandfamily.com',
    //           subject:
    //             'Plaquitas para mascotas CR, restablecimiento de la contraseña',
    //           template: 'index',
    //           context: {
    //             text:
    //               'La contraseña de su correo ' +
    //               user.email +
    //               ' ha sido actualizada satisfactoriamente.\n',
    //             link: req.headers.referer + '/login',
    //             textLink: 'Iniciar sesión',
    //           },
    //         };
    //         smtpTransport.sendMail(mailOptions, function (err) {
    //           res.json({
    //             success: true,
    //             msg: 'Your password has been successfully updated.',
    //           });
    //         });
    //       },
    //     ],
    //     function (err) {
    //       res.json({
    //         success: false,
    //         msg: 'An error occurred in the process.',
    //         error: JSON.parse(JSON.stringify(err)),
    //       });
    //     }
    //   );
  },
};

export default userCtl;
