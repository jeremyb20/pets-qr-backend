import { Request, Response, NextFunction } from 'express';
import Pet, { DefaultPermissions } from '../models/Pet.model';
import User from '../models/User.model';
import QrCode from '../models/QrCode.model';
import 'dotenv/config';
import cloudinary from 'cloudinary';
import { IUser } from '../interfaces/IUser';
import cacheService from '../config/redis';
const cloudinaryV2 = cloudinary.v2;

interface IPetController {
  getPublicProfileById(req: Request, res: Response): Promise<void>;
  getProfileById(req: Request, res: Response): Promise<void>;
  getAllPetsByStatus(req: Request, res: Response): Promise<void>;
  searchPetsByName(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}
const PetController: IPetController = {
  /**
   * Obtener perfil publico por id de mascota
   */
  getPublicProfileById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Buscar en el modelo Pet por memberPetId
      const pet = await Pet.findOne({ memberPetId: id }).select(
        'memberPetId petName petFirstSurname petSecondSurname genderSelected breed weight petStatus birthDate favoriteActivities healthAndRequirements phoneVeterinarian veterinarianContact photo address lat lng isDigitalIdentificationActive petViewCounter permissions petStatusReport createdAt updatedAt phone ownerPetName owner lat lng notes'
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

        // Obtener permisos (combinar con permisos por defecto si no existen)
        const permissions = petObject.permissions || DefaultPermissions;

        // Función para filtrar datos según permisos (solo incluye campos permitidos)
        const filterByPermissions = (data: any, perms: any) => {
          const filtered: any = {};

          // Campos que siempre se muestran
          filtered._id = data._id;
          filtered.memberPetId = data.memberPetId;
          filtered.petName = data.petName;
          filtered.petFirstSurname = data.petFirstSurname;
          filtered.petSecondSurname = data.petSecondSurname;
          filtered.petStatus = data.petStatus;
          filtered.photo = data.photo;
          filtered.isDigitalIdentificationActive =
            data.isDigitalIdentificationActive;
          filtered.petViewCounter = data.petViewCounter;
          filtered.petStatusReport = data.petStatusReport;
          filtered.createdAt = data.createdAt;
          filtered.updatedAt = data.updatedAt;
          filtered.notes = data.notes;
          filtered.permissions = perms;

          // Campos condicionales (solo se añaden si el permiso está activo)
          if (perms.showBreedInfo) {
            filtered.breed = data.breed;
          }

          if (perms.showWeightInfo) {
            filtered.weight = data.weight;
          }

          if (perms.showPhoneInfo) {
            filtered.phone = data.phone;
          }

          if (perms.showOwnerPetName) {
            filtered.ownerPetName = data.ownerPetName;
          }

          if (perms.showBirthDate) {
            filtered.birthDate = data.birthDate;
          }

          if (perms.showAddressInfo) {
            filtered.address = data.address;
          }

          if (perms.showVeterinarianContact) {
            filtered.veterinarianContact = data.veterinarianContact;
          }

          if (perms.showPhoneVeterinarian) {
            filtered.phoneVeterinarian = data.phoneVeterinarian;
          }

          if (perms.showHealthAndRequirements) {
            filtered.healthAndRequirements = data.healthAndRequirements;
          }

          if (perms.showFavoriteActivities) {
            filtered.favoriteActivities = data.favoriteActivities;
          }

          if (perms.showGenderInfo) {
            filtered.genderSelected = data.genderSelected;
          }

          if (perms.showLocationInfo) {
            filtered.lat = data.lat;
            filtered.lng = data.lng;
          }

          return filtered;
        };

        // Preparar datos del owner (solo incluye campos permitidos)
        const getOwnerData = (userData: any, ownerIdValue: any, perms: any) => {
          const ownerInfo: any = {
            _id: userData?._id || ownerIdValue,
          };

          // Nombre siempre visible
          if (userData?.profile?.name) {
            ownerInfo.name = userData.profile.name;
          }

          // Foto de perfil siempre visible si existe
          if (userData?.profile?.photoProfile) {
            ownerInfo.photoProfile = userData.profile.photoProfile;
          }

          // Avatar siempre visible
          ownerInfo.avatarProfile = userData?.profile?.avatarProfile || '2';

          // Username (solo si hay algún permiso de contacto)
          if (perms.showEmailInfo || perms.showPhoneInfo) {
            const username =
              userData?.profile?.username || userData?.username || '';
            if (username) {
              ownerInfo.username = username;
            }
          }

          // Email (solo si permiso activo y existe)
          if (perms.showEmailInfo && userData?.email) {
            ownerInfo.email = userData.email;
          }

          // Teléfono (solo si permiso activo y existe)
          if (perms.showPhoneInfo && userData?.profile?.phone) {
            ownerInfo.phone = userData.profile.phone;
          }

          // Dirección (solo si permiso activo y existe)
          if (perms.showAddressInfo) {
            if (userData?.profile?.address) {
              ownerInfo.address = userData.profile.address;
            }
            if (userData?.profile?.city) {
              ownerInfo.city = userData.profile.city;
            }
            if (userData?.profile?.state) {
              ownerInfo.state = userData.profile.state;
            }
            if (userData?.profile?.country) {
              ownerInfo.country = userData.profile.country;
            }
          }

          return ownerInfo;
        };

        // Aplicar filtros a los datos de la mascota
        const filteredPetData = filterByPermissions(petObject, permissions);

        // Preparar datos del owner aplicando permisos
        const ownerData = getOwnerData(user, ownerId, permissions);

        // Combinar los datos filtrados
        const petWithOwner = {
          ...filteredPetData,
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

  /**
   * Obtener perfil por id de mascota pero autenticado
   */
  getProfileById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const authenticatedUserId = (req as any).user?.id?.toString();

      // Buscar en el modelo Pet por memberPetId
      const pet = await Pet.findOne({ memberPetId: id }).select(
        'memberPetId petName petFirstSurname petSecondSurname genderSelected breed weight petStatus birthDate favoriteActivities healthAndRequirements phoneVeterinarian veterinarianContact photo address lat lng isDigitalIdentificationActive petViewCounter permissions petStatusReport createdAt updatedAt phone ownerPetName owner lat lng notes'
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

  /**
   * Obtener todas las mascotas perdidas
   */
  getAllPetsByStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        status = 'lost',
        startDate = '',
        endDate = '',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtro base
      let filter: any = {};

      // Filtrar por estado si se especifica y no es 'all'
      if (status && status !== 'all') {
        filter.petStatus = status;
      }

      // Búsqueda
      if (search) {
        filter.$or = [
          { petName: { $regex: search, $options: 'i' } },
          { ownerPetName: { $regex: search, $options: 'i' } },
          { memberPetId: { $regex: search, $options: 'i' } },
          { breed: { $regex: search, $options: 'i' } },
        ];
      }

      // Filtro por fecha
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate as string);
        }
      }

      const startTime = Date.now();

      const [totalPets, pets] = await Promise.all([
        Pet.countDocuments(filter),
        Pet.find(filter)
          .select(
            '_id petName memberPetId phone ownerPetName petStatus birthDate photo photo_id breed weight genderSelected favoriteActivities healthAndRequirements address lat lng phoneVeterinarian veterinarianContact petViewCounter petStatusReport isDigitalIdentificationActive permissions notes createdAt updatedAt'
          )
          .populate({
            path: 'owner',
            select: '_id email profile memberId userStatus role',
          })
          .skip(skip)
          .limit(limitNum)
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 MongoDB query took: ${dbQueryTime}ms`);

      const payload = pets.map((pet) => {
        // Si es una mascota perdida, incluir el último reporte
        let lastLostReport = null;
        if (pet.petStatus === 'lost') {
          lastLostReport = pet.petStatusReport[pet.petStatusReport.length - 1];
        }

        return {
          id: pet._id,
          petName: pet.petName,
          memberPetId: pet.memberPetId,
          ownerPetName: pet.ownerPetName,
          phone: pet.phone,
          petStatus: pet.petStatus,
          birthDate: pet.birthDate,
          photo: pet.photo,
          photo_id: pet.photo_id,
          breed: pet.breed || null,
          weight: pet.weight || null,
          genderSelected: pet.genderSelected || null,
          favoriteActivities: pet.favoriteActivities || null,
          healthAndRequirements: pet.healthAndRequirements || null,
          address: pet.address || null,
          lat: pet.lat || null,
          lng: pet.lng || null,
          phoneVeterinarian: pet.phoneVeterinarian || null,
          veterinarianContact: pet.veterinarianContact || null,
          isDigitalIdentificationActive:
            pet.isDigitalIdentificationActive || false,
          permissions: pet.permissions,
          notes: pet.notes || null,
          createdAt: pet.createdAt,
          updatedAt: pet.updatedAt,
          // Información adicional para mascotas perdidas
          ...(pet.petStatus === 'lost' && {
            lastPlaceLost: lastLostReport?.lastPlaceLost || null,
            lostDate: lastLostReport?.date || null,
            lostDescription: lastLostReport?.descriptionLost || null,
          }),
          viewCount: pet.petViewCounter?.length || 0,
          owner: pet.owner
            ? {
                id: (pet.owner as unknown as IUser)._id,
                email: (pet.owner as unknown as IUser).email,
                memberId: (pet.owner as unknown as IUser).memberId,
                profile: (pet.owner as unknown as IUser).profile,
                userStatus: (pet.owner as unknown as IUser).userStatus,
              }
            : null,
        };
      });

      const response = {
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
      console.log(
        `✅ Request completed in ${totalTime}ms (DB: ${dbQueryTime}ms)`
      );

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error fetching pets:', error);

      const errorResponse = {
        success: false,
        message: 'An error occurred while fetching pets.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },

  /**
   * Buscar mascota por nombre
   */
  searchPetsByName: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        query = '',
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status = 'lost', // Opcional: filtrar por estado (lost, active, inactive, deceased)
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;
      const searchTerm = query as string;

      const cacheKey = `pets:search:${searchTerm}:page:${pageNum}:limit:${limitNum}:status:${status}`;

      // Verificar caché
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        console.log('Cache hit for search key:', cacheKey);
        res.status(200).json(cachedData);
        return;
      }

      // Construir query de búsqueda
      let queryConditions: any = {};

      // Si se especifica un estado, filtrar por él
      if (status && status !== 'all') {
        queryConditions.petStatus = status;
      }

      // Búsqueda por nombre de mascota y otros campos relevantes
      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm, 'i');
        queryConditions.$or = [
          { petName: searchRegex },
          { ownerPetName: searchRegex },
          { memberPetId: searchRegex },
          { breed: searchRegex },
          { 'owner.email': searchRegex }, // Búsqueda en email del dueño (requiere populate)
        ];
      }

      // Determinar campo de ordenamiento
      let sortField: any = {};
      if (sortBy === 'name') {
        sortField = { petName: sortOrder === 'desc' ? -1 : 1 };
      } else if (sortBy === 'status') {
        sortField = { petStatus: sortOrder === 'desc' ? -1 : 1 };
      } else if (sortBy === 'views') {
        sortField = { petViewCounter: sortOrder === 'desc' ? -1 : 1 };
      } else {
        sortField = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };
      }

      const startTime = Date.now();

      // Ejecutar búsqueda
      const [pets, total] = await Promise.all([
        Pet.find(queryConditions)
          .populate({
            path: 'owner',
            select: '_id email profile memberId userStatus role',
          })
          .select(
            '_id petName memberPetId phone ownerPetName petStatus birthDate photo photo_id breed weight genderSelected favoriteActivities healthAndRequirements address lat lng phoneVeterinarian veterinarianContact petViewCounter petStatusReport isDigitalIdentificationActive permissions notes createdAt updatedAt'
          )
          .sort(sortField)
          .skip(skip)
          .limit(limitNum)
          .lean()
          .exec(),
        Pet.countDocuments(queryConditions),
      ]);

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 MongoDB search query took: ${dbQueryTime}ms`);

      // Transformar los datos para la respuesta
      const payload = pets.map((pet) => {
        // Obtener el último reporte si es una mascota perdida
        let lastLostReport = null;
        if (pet.petStatus === 'lost' && pet.petStatusReport?.length > 0) {
          lastLostReport = pet.petStatusReport[pet.petStatusReport.length - 1];
        }

        return {
          id: pet._id,
          petName: pet.petName,
          memberPetId: pet.memberPetId,
          ownerPetName: pet.ownerPetName,
          phone: pet.phone,
          petStatus: pet.petStatus,
          birthDate: pet.birthDate,
          photo: pet.photo,
          photo_id: pet.photo_id,
          breed: pet.breed || null,
          weight: pet.weight || null,
          genderSelected: pet.genderSelected || null,
          favoriteActivities: pet.favoriteActivities || null,
          healthAndRequirements: pet.healthAndRequirements || null,
          address: pet.address || null,
          lat: pet.lat || null,
          lng: pet.lng || null,
          phoneVeterinarian: pet.phoneVeterinarian || null,
          veterinarianContact: pet.veterinarianContact || null,
          isDigitalIdentificationActive:
            pet.isDigitalIdentificationActive || false,
          permissions: pet.permissions,
          notes: pet.notes || null,
          createdAt: pet.createdAt,
          updatedAt: pet.updatedAt,
          // Información adicional para mascotas perdidas
          ...(pet.petStatus === 'lost' && {
            lastPlaceLost: lastLostReport?.lastPlaceLost || null,
            lostDate: lastLostReport?.date || null,
            lostDescription: lastLostReport?.descriptionLost || null,
          }),
          viewCount: pet.petViewCounter?.length || 0,
          // Información del dueño
          owner: pet.owner
            ? {
                id: (pet.owner as unknown as IUser)._id,
                email: (pet.owner as unknown as IUser).email,
                memberId: (pet.owner as unknown as IUser).memberId,
                profile: (pet.owner as unknown as IUser).profile,
                userStatus: (pet.owner as unknown as IUser).userStatus,
              }
            : null,
        };
      });

      const response = {
        success: true,
        payload,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      };

      // Guardar en caché (300 segundos = 5 minutos)
      await cacheService.setex(cacheKey, 300, response);
      console.log(`✅ Search completed in ${Date.now() - startTime}ms`);

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error searching pets:', error);
      next(error);
    }
  },
};

export default PetController;
