import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import User, { IUser } from '../../models/User.model';
import { cacheService } from '../../config/redis';
import 'dotenv/config';
import {
  ApiResponse,
  ErrorResponse,
  UserFilters,
  UserQueryParams,
} from '../../types/response.type';
import { AdminController, PetProfile } from '../../types/admin.types';
import { FlattenMaps } from 'mongoose';

const cloudinaryV2 = cloudinary.v2;

// Interfaces para los tipos
const adminCtl: AdminController = {
  getAllUsersLegacy: async (_req: Request, res: Response): Promise<void> => {
    const users = await User.find();
    if (users.length == 0) {
      res.send({ success: false, msg: 'An error occurred in the process.' });
    } else {
      const object: any[] = [];
      users.forEach((item: any) => {
        if (!item.isActivated) {
          const newPetObject: PetProfile[] = [];
          if (item.newPetProfile.length > 0) {
            item.newPetProfile.forEach((element: any) => {
              const pet: PetProfile = {
                _id: item._id,
                idParental: element._id,
                petName: element.petName,
                email: element.email,
                phone: element.phone,
                photo: element.photo,
                age: element.age,
                birthDate: element.birthDate,
                ownerPetName: element.ownerPetName,
                petStatus: element.petStatus,
                petViewCounter: element.petViewCounter,
                photo_id: element.photo_id,
                isDigitalIdentificationActive:
                  element.isDigitalIdentificationActive ? true : false,
              };
              newPetObject.push(pet);
            });
          }

          const test = {
            id: item._id,
            email: item.email,
            petStatus: item.petStatus,
            updatedAt: item.updatedAt,
            createdAt: item.createdAt,
            userState: item.userState,
            newPetProfile: newPetObject.length > 0 ? newPetObject : null,
          };
          object.push(test);
        }
      });
      res.status(200).send({ success: true, payload: object });
    }
  },

  getAllRegisteredUsers: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        status = '',
        startDate = '',
        endDate = '',
      } = req.query as UserQueryParams;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      let filter: UserFilters = { isActivated: false };

      // Búsqueda por email
      if (search) {
        filter.email = { $regex: search, $options: 'i' };
      }

      // Filtro por status
      if (status && status !== 'all') {
        filter.userStatus = Number(status);
      }

      // Filtro por fecha
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate);
        }
      }

      // Cache key (comentado por ahora)
      // const cacheKey = `users:page:${pageNum}:limit:${limitNum}:search:${search}:status:${status}:startDate:${startDate}:endDate:${endDate}`;

      const startTime = Date.now();

      const [totalUsers, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
          .select(
            '_id email userStatus name role createdAt updatedAt pets phone address country'
          )
          .populate({
            path: 'pets',
            select:
              'petName email phone photo age birthDate ownerPetName petStatus petViewCounter photo_id isDigitalIdentificationActive',
          })
          .skip(skip)
          .limit(limitNum)
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 MongoDB query took: ${dbQueryTime}ms`);

      const payload = users.map((item: FlattenMaps<IUser>) => {
        const petsArray: PetProfile[] = [];

        if (item.pets && item.pets.length > 0) {
          item.pets.forEach((pet: any) => {
            const petProfile: PetProfile = {
              _id: pet._id,
              idParental: item._id,
              petName: pet.petName,
              email: pet.email,
              phone: pet.phone,
              photo: pet.photo,
              age: pet.age,
              birthDate: pet.birthDate,
              ownerPetName: pet.ownerPetName,
              petStatus: pet.petStatus,
              petViewCounter: pet.petViewCounter,
              photo_id: pet.photo_id,
              isDigitalIdentificationActive:
                !!pet.isDigitalIdentificationActive,
            };
            petsArray.push(petProfile);
          });
        }

        return {
          id: item._id,
          email: item.email,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          userStatus: item.userStatus,
          phone: item.phone,
          address: item.address,
          country: item.country,
          name: item.name,
          role: item.role,
          pets: petsArray.length > 0 ? petsArray : null,
        };
      });

      const response: ApiResponse<typeof payload> = {
        success: true,
        payload,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limitNum),
        },
      };

      // Cache (comentado por ahora)
      // await cacheService.setex(cacheKey, 300, response);

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Request completed in ${totalTime}ms (DB: ${dbQueryTime}ms)`
      );

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error fetching users:', error);

      // Usando next para manejo centralizado de errores

      // O si prefieres manejar directamente:
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while fetching users.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },

  // Controlador actualizado
  updateUserById: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    const { id, email, name, phone, address, country, userStatus, role, pets } =
      req.body;

    try {
      await User.findByIdAndUpdate(id, {
        email,
        name,
        phone,
        address,
        country,
        userStatus,
        role,
        pets,
        updatedAt: new Date(), // Actualizar la fecha de modificación
      });

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

  getNewCodes: async (req: Request, res: Response): Promise<void> => {
    const users = await User.find();
    if (users.length == 0) {
      res
        .status(200)
        .send({ success: false, msg: 'An error occurred in the process.' });
    } else {
      const object: any[] = [];
      users.forEach((item: any) => {
        if (item.isActivated) {
          if (item.hostName == req.headers.referer) {
            const host = item.hostName ? item.hostName : req.headers.referer;
            const code = {
              id: item._id,
              randomCode: item.randomCode,
              isActivated: item.isActivated,
              stateActivation: item.stateActivation,
              updatedAt: item.updatedAt,
              link: host + 'myPetCode/' + item._id + '/' + 0,
            };
            object.push(code);
          }
        }
      });
      res.status(200).send({ success: true, payload: object });
    }
  },

  deleteUserById: async (req: Request, res: Response): Promise<void> => {
    const photo = await User.findByIdAndDelete(req.query.id);
    if (photo && (photo as any).image_id) {
      await cloudinaryV2.uploader.destroy((photo as any).image_id);
    }

    res.send({ success: true, msg: 'The information was updated correctly' });
  },

  // editUser: async (
  //   req: Request,
  //   res: Response,
  //   next?: NextFunction
  // ): Promise<void> => {
  //   const {
  //     petName,
  //     email,
  //     phone,
  //     age,
  //     birthDate,
  //     ownerPetName,
  //     petStatus,
  //     userState,
  //     isDigitalIdentificationActive,
  //   } = req.body;
  //   try {
  //     await User.findByIdAndUpdate(req.body.id, {
  //       petName,
  //       email,
  //       phone,
  //       age,
  //       birthDate,
  //       ownerPetName,
  //       petStatus,
  //       userState,
  //       isDigitalIdentificationActive,
  //     });
  //     res.send({ msg: 'The information was updated correctly', success: true });
  //   } catch (err) {
  //     res.json({ success: false, msg: 'An error occurred in the process.' });
  //     if (next) next(err);
  //   }
  // },

  editUserSecondLevel: async (req: Request, res: Response): Promise<void> => {
    const { isDigitalIdentificationActive } = req.body;
    try {
      if (req.body.idSecond === 0) {
        await User.findByIdAndUpdate(req.body._id, {
          isDigitalIdentificationActive,
        });
      } else {
        await User.findOneAndUpdate(
          { _id: req.body._id, 'newPetProfile._id': req.body.idParental },
          {
            $set: {
              'newPetProfile.$.isDigitalIdentificationActive':
                isDigitalIdentificationActive,
            },
          }
        );
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

  deletePetByIdForAdmin: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      await User.findByIdAndUpdate(req.body.idPrimary, {
        $pull: { newPetProfile: { _id: req.body.idSecond } },
      }).then(async function (data) {
        if (req.body.photo_id) {
          await cloudinaryV2.uploader.destroy(req.body.photo_id);
        }

        res.json({ success: true, msg: 'Delete successfull.' });
      });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  createNewCode: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      const myUser = await User.findOne({ randomCode: req.body.randomCode });

      if (myUser) {
        res.json({
          success: false,
          msg: 'An error occurred in the process.',
        });
      } else {
        let newPet = new User({
          randomCode: req.body.randomCode,
          isActivated: req.body.isActivated,
          stateActivation: req.body.stateActivation,
          hostName: req.headers.referer,
        });

        (User as any).addNewCode(newPet, async (user: any, done: any) => {
          try {
            res.json({
              success: true,
              msg: 'The process was successfully completed.',
            });
          } catch (err) {
            res.json({
              success: false,
              msg: 'An error occurred in the process.',
            });
            if (next) next(err);
          }
        });
      }
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
      });
    }
  },

  updateStateActivationCode: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    const { stateActivation } = req.body;
    try {
      await User.findByIdAndUpdate(req.body.id, {
        stateActivation,
        hostName: req.headers.referer,
      });
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (err) {
      res.json({ success: false, msg: 'An error occurred in the process.' });
      if (next) next(err);
    }
  },

  getLocationAllPets: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    try {
      const pets = await User.find({});
      const object: any[] = [];
      pets.forEach((item: any) => {
        if (!item.isActivated) {
          if (item.newPetProfile.length > 0) {
            item.newPetProfile.forEach((element: any) => {
              const pet = {
                _id: element._id,
                idPrimary: item._id,
                petName: element.petName,
                email: element.email,
                lat: element.lat,
                lng: element.lng,
                photo: element.photo,
                showPanel: true,
                petStatus: element.petStatus,
              };
              object.push(pet);
            });
          }
        }
      });
      res.json(object);
    } catch (error) {
      res.json({ success: false, msg: error });
      if (next) next();
    }
  },

  updateFirstProfile: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    const {
      address,
      age,
      birthDate,
      country,
      email,
      favoriteActivities,
      genderSelected,
      healthAndRequirements,
      isDigitalIdentificationActive,
      lat,
      lng,
      ownerPetName,
      petName,
      petStatus,
      phone,
      phoneVeterinarian,
      photo,
      photo_id,
      race,
      userState,
      veterinarianContact,
      weight,
    } = req.body;

    const permissions = {
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
    };
    const newPet = {
      address,
      age,
      birthDate,
      country,
      email,
      favoriteActivities,
      genderSelected,
      healthAndRequirements,
      isDigitalIdentificationActive,
      lat,
      lng,
      ownerPetName,
      permissions: permissions,
      petName,
      petStatus,
      petStatusReport: [],
      phone,
      phoneVeterinarian,
      photo,
      photo_id,
      race,
      userState,
      veterinarianContact,
      weight,
    };

    try {
      await User.findByIdAndUpdate(
        req.body.id,
        { $push: { newPetProfile: newPet } },
        { new: true }
      ).then(async function (data) {
        res.json({
          success: true,
          msg: 'Your pet has been updated successfully.',
        });
      });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  updateLocationPet: async (req: Request, res: Response): Promise<void> => {
    try {
      await User.findOneAndUpdate(
        { _id: req.body.idPrimary, 'newPetProfile._id': req.body.idSecondary },
        {
          $set: {
            'newPetProfile.$.lat': req.body.lat,
            'newPetProfile.$.lng': req.body.lng,
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

  sortNewPetProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      await User.findByIdAndUpdate(req.body._id, req.body);
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (error) {
      res.json({
        success: false,
        msg: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },
};

export default adminCtl;
