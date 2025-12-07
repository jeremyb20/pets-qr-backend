import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import User from '../models/User.model';
import Pet from '../models/Pet.model';
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
} from '../types/pet.types';
import QrCode from '../models/QrCode.model';
import mongoose, { Types } from 'mongoose';
import {
  IUser,
  IUserThemeConfig,
  RegistrationRequest,
} from '../interfaces/IUser';
import { IPet } from '../interfaces/Ipet';

const cloudinaryV2 = cloudinary.v2;

interface AuthRequest {
  email: string;
  password: string;
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
  registerAccountWithEmail(req: Request, res: Response): Promise<void>;
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
  addPetToExistingUser(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  registerNewPetfromUserProfile(
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
        res.json({ success: false, message: 'Email not found' });
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
            res.json({ success: false, message: 'Wrong password' });
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
        res.json({ success: false, message: 'Wrong password' });
      }
    } catch (error) {
      console.error('Error in authenticate method:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
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
        message: 'Internal server error',
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
         breed 
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
      const payload: IPet[] = (userWithPets?.pets || []).map((pet: any) => ({
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
        breed: pet.breed || '',
        weight: pet.weight || '',
        genderSelected: pet.genderSelected || '',
        favoriteActivities: pet.favoriteActivities || '',
        healthAndRequirements: pet.healthAndRequirements || '',
        address: pet.address || '',
        memberPetId: pet.memberPetId || '',
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
        // 'petName photo phone genderSelected weight breed birthDate petStatus memberPetId owner permissions petViewCounter isDigitalIdentificationActive createdAt updatedAt favoriteActivities healthAndRequirements '
        ' memberPetId petName genderSelected breed weight petStatus birthDate favoriteActivities healthAndRequirements phoneVeterinarian veterinarianContact photo  address lat lng linkTwitter linkFacebook linkInstagram isDigitalIdentificationActive  petViewCounter  permissions  petStatusReport  createdAt updatedAt  phone ownerPetName'
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
        message: 'Código o mascota no encontrada',
        type: 'not_found',
      });
    } catch (error) {
      console.error('Error in getProfileById:', error);
      res.status(500).json({
        success: false,
        message: 'Ocurrió un error al buscar la información.',
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
            message: 'Error uploading image',
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
        message: 'Error interno del servidor al agregar la mascota',
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
    const id = (req.user as IUser)?.id?.toString();

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
        message: 'The information was updated correctly',
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
        breed: (user as any).breed,
        weight: (user as any).weight,
        phone: user.profile.phone,
        country: user.profile.country,
      };
      res.status(200).send({
        success: true,
        payload: userData,
      });
    } else {
      res.status(200).send({ success: false, message: 'User not found' });
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
              res
                .status(200)
                .send({ success: false, message: 'User not found' });
            }
          }
        } else {
          res.status(200).send({ success: false, message: 'User not found' });
        }
      } else {
        res.status(200).send({ success: false, message: 'User not found' });
      }
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
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
            breed: (user as any).breed,
            weight: (user as any).weight,
          };
          res.status(200).send({
            success: true,
            payload: userData,
          });
        }
      }
    } else {
      res.status(200).send({ success: false, message: 'User not found' });
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
          message: petInfo ? '' : 'User not found',
        });
      }
    } else {
      res.status(200).send({ success: false, message: 'User not found' });
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
      breed,
      weight,
    } = req.body as IPet;

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
        breed,
        weight,
      });
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
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
      breed,
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
            'newPetProfile.$.breed': breed,
            'newPetProfile.$.weight': weight,
            'newPetProfile.$.country': country,
          },
        }
      );
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
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
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  editThemeProfile: async (req: Request, res: Response): Promise<void> => {
    const { theme } = req.body;
    try {
      await User.findByIdAndUpdate(req.body._id, { theme });
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
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
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
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
          message: 'Error interno al generar identificadores únicos',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      });
    }
  },

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
        message: 'The email already exists in the system',
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
        //         message: 'Your pet has been created successfully.',
        //       });
        //     });
        //   } catch (error) {
        //     res.json({
        //       success: false,
        //       message: 'The email already exists in the system',
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
              message: 'Your pet has been created successfully.',
            });
          });
        } catch (error) {
          res.json({
            success: false,
            message: 'The email already exists in the system',
            error: JSON.parse(JSON.stringify(error)),
          });
          if (next) next(error);
        }
      } catch (error) {
        res.json({
          success: false,
          message: 'An error occurred in the process.',
          error: JSON.parse(JSON.stringify(error)),
        });
      }
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
        permissions: {
          showPhoneInfo: true,
          showEmailInfo: true,
          showLinkTwitter: true,
          showLinkFacebook: true,
          showLinkInstagram: true,
          showOwnerPetName: true,
          showBirthDate: true,
          showAddressInfo: true,
          showAgeInfo: true,
          showVeterinarianContact: true,
          showPhoneVeterinarian: true,
          showHealthAndRequirements: true,
          showFavoriteActivities: true,
          showLocationInfo: true,
        },
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
        message: 'Error interno del servidor',
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
        permissions: {
          showPhoneInfo: true,
          showEmailInfo: true,
          showLinkTwitter: true,
          showLinkFacebook: true,
          showLinkInstagram: true,
          showOwnerPetName: true,
          showBirthDate: true,
          showAddressInfo: true,
          showAgeInfo: true,
          showVeterinarianContact: true,
          showPhoneVeterinarian: true,
          showHealthAndRequirements: true,
          showFavoriteActivities: true,
          showLocationInfo: true,
        },
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
        message: 'Error interno del servidor al agregar la mascota',
      });
    }
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
    //         message: 'Your pet has been created successfully.',
    //       });
    //     });
    //   } catch (error) {
    //     res.json({
    //       success: false,
    //       message: 'An error occurred in the process.',
    //       error: JSON.parse(JSON.stringify(error)),
    //     });
    //   }
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
        permissions: {
          showPhoneInfo: true,
          showEmailInfo: true,
          showLinkTwitter: true,
          showLinkFacebook: true,
          showLinkInstagram: true,
          showOwnerPetName: true,
          showBirthDate: true,
          showAddressInfo: true,
          showAgeInfo: true,
          showVeterinarianContact: true,
          showPhoneVeterinarian: true,
          showHealthAndRequirements: true,
          showFavoriteActivities: true,
          showLocationInfo: true,
        },
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

      // Paso 7: Responder con éxito
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
        message: 'An error occurred while validating the QR code.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
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
    //         message: 'Your pet has been deleted successfully.',
    //       });
    //     });
    //   } catch (error) {
    //     res.json({
    //       success: false,
    //       message: 'An error occurred in the process.',
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
    //             return res.json({ success: false, message: 'Email not found' });
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
    //             message:
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
    //         message: 'An error occurred in the process.',
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
    //                 message: 'El token de restablecimiento de contraseña no es válido o ha caducado..',
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
    //             message: 'Your password has been successfully updated.',
    //           });
    //         });
    //       },
    //     ],
    //     function (err) {
    //       res.json({
    //         success: false,
    //         message: 'An error occurred in the process.',
    //         error: JSON.parse(JSON.stringify(err)),
    //       });
    //     }
    //   );
  },
};

export default userCtl;
