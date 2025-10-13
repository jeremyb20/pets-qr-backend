import { Request, Response, NextFunction } from 'express';
import cloudinary from 'cloudinary';
import User, { IUser } from '../models/User';
import Pet from '../models/Pet';
import fs from 'fs-extra';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

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
  getUserProfileByIdScanner(req: Request, res: Response): Promise<void>;
  getMyPetCode(req: Request, res: Response): Promise<void>;
  getMyPetInfo(req: Request, res: Response): Promise<void>;
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
            theme: user.theme,
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
        address: user.address,
        phone: user.phone,
        email: user.email,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
        country: user.country,
        userState: user.userStatus,
        role: user.role,
        theme: user.theme,
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
        phone: user.phone,
        photo: (user as any).photo,
        photo_id: (user as any).photo_id,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
        newPetProfile: (user as any).newPetProfile,
        genderSelected: (user as any).genderSelected,
        _id: user._id,
        race: (user as any).race,
        weight: (user as any).weight,
        country: user.country,
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
            phone: user.phone,
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
