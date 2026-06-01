import { Request, Response, NextFunction } from 'express';
import Pet, { DefaultPermissions } from '../models/Pet.model';
import User from '../models/User.model';
import QrCode from '../models/QrCode.model';
import 'dotenv/config';
import cloudinary from 'cloudinary';
import { IUser } from '../interfaces/IUser';
const cloudinaryV2 = cloudinary.v2;

interface IPetController {
  getPublicProfileById(req: Request, res: Response): Promise<void>;
  getProfileById(req: Request, res: Response): Promise<void>;
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
};

export default PetController;
