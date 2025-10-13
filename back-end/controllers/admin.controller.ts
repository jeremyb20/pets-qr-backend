// const adminCtl = {};
// const cloudinary = require('cloudinary').v2;
// const Pet = require('../models/old/pet');
// const { cacheService } = require('../config/redis');
// require('dotenv').config();

// adminCtl.getAllUsersLegacy = async (_req, res) => {
//   const users = await Pet.find();
//   if (users.length == 0) {
//     res.send({ success: false, msg: 'An error occurred in the process.' });
//   } else {
//     const object = [];
//     users.forEach((item) => {
//       if (!item.isActivated) {
//         var newPetObject = [];
//         if (item.newPetProfile.length > 0) {
//           item.newPetProfile.forEach((element) => {
//             var pet = {
//               _id: item._id,
//               idParental: element._id,
//               petName: element.petName,
//               email: element.email,
//               phone: element.phone,
//               photo: element.photo,
//               age: element.age,
//               birthDate: element.birthDate,
//               ownerPetName: element.ownerPetName,
//               petStatus: element.petStatus,
//               petViewCounter: element.petViewCounter,
//               photo_id: element.photo_id,
//               isDigitalIdentificationActive:
//                 element.isDigitalIdentificationActive ? true : false,
//             };
//             newPetObject.push(pet);
//           });
//         }

//         var test = {
//           id: item._id,
//           // petName: item.petName,
//           email: item.email,
//           // phone: item.phone,
//           // age: item.age,
//           // birthDate: item.birthDate,
//           // ownerPetName: item.ownerPetName,
//           petStatus: item.petStatus,
//           updatedAt: item.updatedAt,
//           createdAt: item.createdAt,
//           userState: item.userState,
//           //isDigitalIdentificationActive: item.isDigitalIdentificationActive,
//           newPetProfile: newPetObject.length > 0 ? newPetObject : null,
//         };
//         object.push(test);
//       }
//     });
//     res.status(200).send({ success: true, payload: object });
//   }
// };

// // Nuevo método con paginación y caching con Upstash
// // Backend - adminController.js
// adminCtl.getAllRegisteredUsers = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     // Obtener filtros del query
//     const { search, status, startDate, endDate } = req.query;

//     // Construir objeto de filtro para MongoDB
//     let filter = { isActivated: false };

//     // Aplicar filtro de búsqueda por email
//     if (search) {
//       filter.email = { $regex: search, $options: 'i' };
//     }

//     // Aplicar filtro por estado
//     if (status && status !== 'all') {
//       filter.userState = Number(status);
//     }

//     // Aplicar filtro por fecha
//     if (startDate || endDate) {
//       filter.createdAt = {};
//       if (startDate) {
//         filter.createdAt.$gte = new Date(startDate);
//       }
//       if (endDate) {
//         filter.createdAt.$lte = new Date(endDate);
//       }
//     }

//     // Clave única para el cache que incluya los filtros
//     const cacheKey = `users:page:${page}:limit:${limit}:search:${
//       search || ''
//     }:status:${status || ''}:startDate:${startDate || ''}:endDate:${
//       endDate || ''
//     }`;

//     // 1. INTENTAR OBTENER DESDE CACHE
//     const cachedData = await cacheService.get(cacheKey);
//     if (cachedData) {
//       console.log('🚀 Serving from Redis Cache');
//       return res.json(cachedData);
//     }

//     console.log('🔍 Querying MongoDB...');
//     const startTime = Date.now();

//     // 2. CONSULTAR MONGODB (si no hay cache)
//     const [totalUsers, users] = await Promise.all([
//       Pet.countDocuments(filter),
//       Pet.find(filter)
//         .select(
//           '_id email petStatus userState createdAt updatedAt newPetProfile'
//         )
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//     ]);

//     const dbQueryTime = Date.now() - startTime;
//     console.log(`📊 MongoDB query took: ${dbQueryTime}ms`);

//     // Procesar datos (mantener tu lógica actual)
//     const payload = users.map((item) => {
//       const newPetObject = [];

//       if (item.newPetProfile && item.newPetProfile.length > 0) {
//         item.newPetProfile.forEach((element) => {
//           const pet = {
//             _id: item._id,
//             idParental: element._id,
//             petName: element.petName,
//             email: element.email,
//             phone: element.phone,
//             photo: element.photo,
//             age: element.age,
//             birthDate: element.birthDate,
//             ownerPetName: element.ownerPetName,
//             petStatus: element.petStatus,
//             petViewCounter: element.petViewCounter,
//             photo_id: element.photo_id,
//             isDigitalIdentificationActive:
//               !!element.isDigitalIdentificationActive,
//           };
//           newPetObject.push(pet);
//         });
//       }

//       return {
//         id: item._id,
//         email: item.email,
//         petStatus: item.petStatus,
//         updatedAt: item.updatedAt,
//         createdAt: item.createdAt,
//         userState: item.userState,
//         newPetProfile: newPetObject.length > 0 ? newPetObject : null,
//       };
//     });

//     const totalPages = Math.ceil(totalUsers / limit);

//     const response = {
//       success: true,
//       payload,
//       totalPages,
//       currentPage: page,
//       total: totalUsers,
//     };

//     // 3. GUARDAR EN CACHE PARA PRÓXIMAS CONSULTAS
//     await cacheService.setex(cacheKey, 300, response); // 5 minutos

//     const totalTime = Date.now() - startTime;
//     console.log(
//       `✅ Request completed in ${totalTime}ms (DB: ${dbQueryTime}ms)`
//     );

//     res.json(response);
//   } catch (error) {
//     console.error('❌ Error fetching users:', error);
//     res.status(500).json({
//       success: false,
//       message: 'An error occurred in the process.',
//     });
//   }
// };

// adminCtl.getNewCodes = async (req, res) => {
//   const users = await Pet.find();
//   if (users.length == 0) {
//     res
//       .status(200)
//       .send({ success: false, msg: 'An error occurred in the process.' });
//   } else {
//     const object = [];
//     users.forEach((item) => {
//       if (item.isActivated) {
//         if (item.hostName == req.headers.referer) {
//           const host = item.hostName ? item.hostName : req.headers.referer;
//           var code = {
//             id: item._id,
//             randomCode: item.randomCode,
//             isActivated: item.isActivated,
//             stateActivation: item.stateActivation,
//             updatedAt: item.updatedAt,
//             link: host + 'myPetCode/' + item._id + '/' + 0,
//           };
//           object.push(code);
//         }
//       }
//     });
//     res.status(200).send({ success: true, payload: object });
//   }
// };

// adminCtl.deleteUserById = async (req, res) => {
//   const photo = await Pet.findByIdAndDelete(req.query.id);
//   if (photo.image_id) {
//     await cloudinary.uploader.destroy(photo.image_id);
//   }

//   res.send({ success: true, msg: 'The information was updated correctly' });
// };

// adminCtl.editUser = async (req, res) => {
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
//     await Pet.findByIdAndUpdate(req.body.id, {
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
//     next(err);
//   }
// };

// adminCtl.editUserSecondLevel = async (req, res) => {
//   const { isDigitalIdentificationActive } = req.body;
//   try {
//     if (req.body.idSecond === 0) {
//       await Pet.findByIdAndUpdate(req.body._id, {
//         isDigitalIdentificationActive,
//       });
//     } else {
//       await Pet.findOneAndUpdate(
//         { _id: req.body._id, 'newPetProfile._id': req.body.idParental },
//         {
//           $set: {
//             'newPetProfile.$.isDigitalIdentificationActive':
//               isDigitalIdentificationActive,
//           },
//         }
//       );
//     }
//     res.send({ msg: 'The information was updated correctly', success: true });
//   } catch (error) {
//     res.json({
//       success: false,
//       msg: 'An error occurred in the process.',
//       error: JSON.parse(JSON.stringify(error)),
//     });
//   }
// };

// adminCtl.deletePetByIdForAdmin = async (req, res, next) => {
//   try {
//     await Pet.findByIdAndUpdate(req.body.idPrimary, {
//       $pull: { newPetProfile: { _id: req.body.idSecond } },
//     }).then(async function (data) {
//       if (req.body.photo_id) {
//         await cloudinary.uploader.destroy(req.body.photo_id);
//       }

//       res.json({ success: true, msg: 'Delete successfull.' });
//     });
//   } catch (error) {
//     res.json({
//       success: false,
//       msg: 'An error occurred in the process.',
//       error: JSON.parse(JSON.stringify(error)),
//     });
//   }
// };

// adminCtl.createNewCode = async (req, res) => {
//   Pet.findOne(
//     { randomCode: req.body.randomCode },
//     async function (err, myUser) {
//       if (!err) {
//         if (myUser) {
//           res.json({
//             success: false,
//             msg: 'An error occurred in the process.',
//           });
//         } else {
//           let newPet = new Pet({
//             randomCode: req.body.randomCode,
//             isActivated: req.body.isActivated,
//             stateActivation: req.body.stateActivation,
//             hostName: req.headers.referer,
//           });

//           Pet.addNewCode(newPet, async (user, done) => {
//             try {
//               res.json({
//                 success: true,
//                 msg: 'The process was successfully completed.',
//               });
//             } catch (err) {
//               res.json({
//                 success: false,
//                 msg: 'An error occurred in the process.',
//               });
//               next(err);
//             }
//           });
//         }
//       } else {
//         res.json({ success: false, msg: 'An error occurred in the process.' });
//       }
//     }
//   );
// };

// adminCtl.updateStateActivationCode = async (req, res) => {
//   const { stateActivation } = req.body;
//   try {
//     await Pet.findByIdAndUpdate(req.body.id, {
//       stateActivation,
//       hostName: req.headers.referer,
//     });
//     res.send({ msg: 'The information was updated correctly', success: true });
//   } catch (err) {
//     res.json({ success: false, msg: 'An error occurred in the process.' });
//     next(err);
//   }
// };

// adminCtl.getLocationAllPets = async (req, res) => {
//   Pet.find({}, function (err, pets) {
//     if (err) {
//       res.json({ success: false, msg: err });
//       next();
//     }
//     const object = [];
//     pets.forEach((item) => {
//       if (!item.isActivated) {
//         var newPetObject = [];
//         if (item.newPetProfile.length > 0) {
//           item.newPetProfile.forEach((element) => {
//             var pet = {
//               _id: element._id,
//               idPrimary: item._id,
//               petName: element.petName,
//               email: element.email,
//               lat: element.lat,
//               lng: element.lng,
//               photo: element.photo,
//               showPanel: true,
//               petStatus: element.petStatus,
//             };
//             object.push(pet);
//           });
//         }
//       }
//     });
//     res.json(object);
//   });
// };

// adminCtl.updateFirstProfile = async (req, res, next) => {
//   const {
//     address,
//     age,
//     birthDate,
//     country,
//     email,
//     favoriteActivities,
//     genderSelected,
//     healthAndRequirements,
//     isDigitalIdentificationActive,
//     lat,
//     lng,
//     ownerPetName,
//     petName,
//     petStatus,
//     phone,
//     phoneVeterinarian,
//     photo,
//     photo_id,
//     race,
//     userState,
//     veterinarianContact,
//     weight,
//   } = req.body;

//   const permissions = {
//     showPhoneInfo: true,
//     showEmailInfo: true,
//     showLinkTwitter: true,
//     showLinkFacebook: true,
//     showLinkInstagram: true,
//     showOwnerPetName: true,
//     showBirthDate: true,
//     showAddressInfo: true,
//     showAgeInfo: true,
//     showVeterinarianContact: true,
//     showPhoneVeterinarian: true,
//     showHealthAndRequirements: true,
//     showFavoriteActivities: true,
//     showLocationInfo: true,
//   };
//   const newPet = {
//     address,
//     age,
//     birthDate,
//     country,
//     email,
//     favoriteActivities,
//     genderSelected,
//     healthAndRequirements,
//     isDigitalIdentificationActive,
//     lat,
//     lng,
//     ownerPetName,
//     permissions: permissions,
//     petName,
//     petStatus,
//     petStatusReport: [],
//     phone,
//     phoneVeterinarian,
//     photo,
//     photo_id,
//     race,
//     userState,
//     veterinarianContact,
//     weight,
//   };

//   try {
//     await Pet.findByIdAndUpdate(
//       req.body.id,
//       { $push: { newPetProfile: newPet } },
//       { new: true }
//     ).then(async function (data) {
//       res.json({
//         success: true,
//         msg: 'Your pet has been updated successfully.',
//       });
//     });
//   } catch (error) {
//     res.json({
//       success: false,
//       msg: 'An error occurred in the process.',
//       error: JSON.parse(JSON.stringify(error)),
//     });
//   }
// };

// adminCtl.updateLocationPet = async (req, res) => {
//   try {
//     await Pet.findOneAndUpdate(
//       { _id: req.body.idPrimary, 'newPetProfile._id': req.body.idSecondary },
//       {
//         $set: {
//           'newPetProfile.$.lat': req.body.lat,
//           'newPetProfile.$.lng': req.body.lng,
//         },
//       }
//     );
//     res.send({ msg: 'The information was updated correctly', success: true });
//   } catch (error) {
//     res.json({
//       success: false,
//       msg: 'An error occurred in the process.',
//       error: JSON.parse(JSON.stringify(error)),
//     });
//   }
// };

// adminCtl.sortNewPetProfile = async (req, res) => {
//   try {
//     await Pet.findByIdAndUpdate(req.body._id, req.body);
//     res.send({ msg: 'The information was updated correctly', success: true });
//   } catch (error) {
//     res.json({
//       success: false,
//       msg: 'An error occurred in the process.',
//       error: JSON.parse(JSON.stringify(error)),
//     });
//   }
// };

// module.exports = adminCtl;

import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import User from '../models/User';
import { cacheService } from '../config/redis';
import 'dotenv/config';
// import { AuthenticatedRequest } from '@/middlewares';

const cloudinaryV2 = cloudinary.v2;

// Interfaces para los tipos
interface UserResponse {
  success: boolean;
  msg?: string;
  payload?: any;
  totalPages?: number;
  currentPage?: number;
  total?: number;
  message?: string;
}

interface PetProfile {
  _id: any;
  petName?: string;
  idParental?: string;
  email?: string;
  phone?: string;
  photo?: string;
  age?: string;
  birthDate?: string;
  ownerPetName?: string;
  petStatus?: string;
  petViewCounter?: any[];
  photo_id?: string;
  isDigitalIdentificationActive?: boolean;
}

interface AdminController {
  getAllUsersLegacy(req: Request, res: Response): Promise<void>;
  getAllRegisteredUsers(req: Request, res: Response): Promise<void>;
  getNewCodes(req: Request, res: Response): Promise<void>;
  deleteUserById(req: Request, res: Response): Promise<void>;
  editUser(req: Request, res: Response, next?: NextFunction): Promise<void>;
  editUserSecondLevel(req: Request, res: Response): Promise<void>;
  deletePetByIdForAdmin(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  createNewCode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updateStateActivationCode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  getLocationAllPets(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updateFirstProfile(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updateLocationPet(req: Request, res: Response): Promise<void>;
  sortNewPetProfile(req: Request, res: Response): Promise<void>;
}

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const { search, status, startDate, endDate } = req.query;

      let filter: any = { isActivated: false };

      if (search) {
        filter.email = { $regex: search, $options: 'i' };
      }

      if (status && status !== 'all') {
        filter.userStatus = Number(status);
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate as string);
        }
      }

      // const cacheKey = `users:page:${page}:limit:${limit}:search:${
      //   search || ''
      // }:status:${status || ''}:startDate:${startDate || ''}:endDate:${
      //   endDate || ''
      // }`;

      // const cachedData = await cacheService.get(cacheKey);
      // if (cachedData) {
      //   console.log('🚀 Serving from Redis Cache');
      //   res.json(cachedData);
      //   return;
      // }

      const startTime = Date.now();

      const [totalUsers, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
          .select('_id email userStatus role createdAt updatedAt pets')
          .populate({
            path: 'pets',
            select:
              'petName email phone photo age birthDate ownerPetName petStatus petViewCounter photo_id isDigitalIdentificationActive',
          })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const dbQueryTime = Date.now() - startTime;
      console.log(`📊 MongoDB query took: ${dbQueryTime}ms`);

      const payload = users.map((item: any) => {
        const petsArray: PetProfile[] = [];

        // Ahora item.pets contendrá los documentos poblados de las mascotas
        if (item.pets && item.pets.length > 0) {
          item.pets.forEach((pet: any) => {
            const petProfile: PetProfile = {
              _id: pet._id, // ID de la mascota
              idParental: item._id, // ID del usuario padre
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
          role: item.role,
          pets: petsArray.length > 0 ? petsArray : null,
        };
      });

      const totalPages = Math.ceil(totalUsers / limit);
      const response: UserResponse = {
        success: true,
        payload,
        totalPages,
        currentPage: page,
        total: totalUsers,
      };

      // await cacheService.setex(cacheKey, 300, response);

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Request completed in ${totalTime}ms (DB: ${dbQueryTime}ms)`
      );

      res.json(response);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred in the process.',
      });
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

  editUser: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    const {
      petName,
      email,
      phone,
      age,
      birthDate,
      ownerPetName,
      petStatus,
      userState,
      isDigitalIdentificationActive,
    } = req.body;
    try {
      await User.findByIdAndUpdate(req.body.id, {
        petName,
        email,
        phone,
        age,
        birthDate,
        ownerPetName,
        petStatus,
        userState,
        isDigitalIdentificationActive,
      });
      res.send({ msg: 'The information was updated correctly', success: true });
    } catch (err) {
      res.json({ success: false, msg: 'An error occurred in the process.' });
      if (next) next(err);
    }
  },

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
