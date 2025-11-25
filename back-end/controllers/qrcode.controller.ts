// back-end/controllers/qrCodeController.ts
import { Request, Response, NextFunction } from 'express';
import QrCode from '../models/QrCode.model';
import User from '../models/User.model';
import Pet from '../models/Pet.model';
import {
  ICreateQrCode,
  IRegisterUserWithQR,
  IAddPetWithQR,
  IScanQRCode,
  IQrCodeTableFilters,
  IQrCode,
} from '../interfaces/IQrCode';
import { ErrorResponse } from '../types/response.type';

interface AuthRequest extends Request {
  user?: any;
}

const qrCodeController = {
  // 🔧 ADMIN: Generar códigos QR
  generateQRCodes: async (req: Request, res: Response): Promise<void> => {
    try {
      const { quantity, price }: { quantity: number; price?: number } =
        req.body;

      if (!quantity || quantity <= 0) {
        res.json({
          success: false,
          message: 'La cantidad debe ser mayor a 0',
        });
        return;
      }

      const codes: ICreateQrCode[] = [];

      for (let i = 0; i < quantity; i++) {
        const randomCode =
          Math.random().toString(36).substring(2, 10).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase();

        codes.push({
          randomCode,
          price: price || 0,
        });
      }

      const qrCodes = codes.map((code) => ({
        randomCode: code.randomCode,
        purchaseInfo: {
          price: code.price,
        },
        status: 'available' as const,
      }));

      await QrCode.insertMany(qrCodes);

      res.json({
        success: true,
        message: `${quantity} códigos QR generados exitosamente`,
        codes: codes.map((code) => code.randomCode),
      });
    } catch (error) {
      console.error('Error generando códigos QR:', error);
      res.json({
        success: false,
        message: 'Error generando códigos QR',
      });
    }
  },

  // 🔍 Verificar código QR disponible
  checkQRCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const { randomCode }: { randomCode: string } = req.body;

      if (!randomCode) {
        res.json({
          success: false,
          message: 'Código QR requerido',
        });
        return;
      }

      const qrCode = await QrCode.findOne({ randomCode });

      if (!qrCode) {
        res.json({
          success: false,
          message: 'Código QR no válido',
        });
        return;
      }

      res.json({
        success: true,
        qrCode: {
          randomCode: qrCode.randomCode,
          status: qrCode.status,
          price: qrCode.purchaseInfo.price,
        },
      });
    } catch (error) {
      console.error('Error verificando código QR:', error);
      res.json({
        success: false,
        message: 'Error verificando código QR',
      });
    }
  },

  // 👤 REGISTRO: Nuevo usuario con mascota y QR
  registerUserWithPetAndQR: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { randomCode, userData, petData }: IRegisterUserWithQR = req.body;

      // Verificar código QR
      const qrCode = await QrCode.findOne({
        randomCode,
        status: 'available',
      });

      if (!qrCode) {
        res.json({
          success: false,
          message: 'Código QR no disponible o ya utilizado',
        });
        return;
      }

      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        res.json({
          success: false,
          message: 'El email ya está registrado',
        });
        return;
      }

      // Generar memberId único
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

      const memberId = await generateMemberId();

      // Crear usuario
      const user = new User({
        ...userData,
        memberId,
        pets: [],
        isActivated: true,
        stateActivation: 'activated',
      });
      await user.save();

      // Crear mascota
      const pet = new Pet({
        ...petData,
        owner: user._id,
        qrCode: qrCode._id,
        isDigitalIdentificationActive: false,
      });
      await pet.save();

      // Actualizar usuario con la mascota
      user.pets.push(pet._id as any);
      await user.save();

      // Actualizar código QR
      qrCode.status = 'activated';
      qrCode.assignedTo = user._id;
      qrCode.assignedPet = pet._id as any;
      qrCode.activatedBy = user._id;
      qrCode.activationDate = new Date();
      qrCode.hostName = req.headers.host;
      await qrCode.save();

      res.json({
        success: true,
        message: 'Usuario y mascota registrados exitosamente',
        user: {
          _id: user._id,
          name: user.profile.name,
          email: user.email,
          memberId: user.memberId,
        },
        pet: {
          _id: pet._id,
          petName: pet.petName,
        },
        qrCode: {
          randomCode: qrCode.randomCode,
          status: qrCode.status,
        },
      });
    } catch (error) {
      console.error('Error en registro completo:', error);
      res.json({
        success: false,
        message: 'Error en el proceso de registro',
      });
    }
  },

  // 🐕 USUARIO EXISTENTE: Agregar mascota con nuevo QR
  addPetWithQR: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { randomCode, petData }: IAddPetWithQR = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      // Verificar código QR
      const qrCode = await QrCode.findOne({
        randomCode,
        status: 'available',
      });

      if (!qrCode) {
        res.json({
          success: false,
          message: 'Código QR no disponible',
        });
        return;
      }

      // Verificar usuario
      const user = await User.findById(userId);
      if (!user) {
        res.json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      // Crear mascota
      const pet = new Pet({
        ...petData,
        owner: userId,
        qrCode: qrCode._id,
        isDigitalIdentificationActive: true,
      });
      await pet.save();

      // Agregar mascota al usuario
      user.pets.push(pet._id as any);
      await user.save();

      // Actualizar código QR
      qrCode.status = 'activated';
      qrCode.assignedTo = userId;
      qrCode.assignedPet = pet._id as unknown as any;
      qrCode.activatedBy = userId;
      qrCode.activationDate = new Date();
      qrCode.hostName = req.headers.host;
      await qrCode.save();

      res.json({
        success: true,
        message: 'Mascota registrada exitosamente',
        pet: {
          _id: pet._id,
          petName: pet.petName,
          qrCode: qrCode.randomCode,
        },
      });
    } catch (error) {
      console.error('Error agregando mascota:', error);
      res.json({
        success: false,
        message: 'Error registrando mascota',
      });
    }
  },

  // 📊 Obtener códigos QR de un usuario
  getUserQRCodes: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const qrCodes = await QrCode.find({ assignedTo: userId }).populate(
        'assignedPet',
        'petName breed photo birthDate'
      );

      const user = await User.findById(userId).populate({
        path: 'pets',
        populate: {
          path: 'qrCode',
          select: 'randomCode status activationDate',
        },
      });

      res.json({
        success: true,
        qrCodes: qrCodes,
        user: {
          name: user?.profile.name,
          email: user?.email,
          totalPets: user?.pets.length,
          pets: user?.pets,
        },
      });
    } catch (error) {
      console.error('Error obteniendo QR codes:', error);
      res.json({
        success: false,
        message: 'Error obteniendo códigos QR',
      });
    }
  },

  // 🔍 Escanear código QR (para encontrar mascota)
  scanQRCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const { randomCode, lat, lng }: IScanQRCode = req.body;

      const qrCode = await QrCode.findOne({ randomCode })
        .populate('assignedTo', 'name phone email permissions')
        .populate(
          'assignedPet',
          'petName breed photo birthDate address phoneVeterinarian veterinarianContact permissions'
        );

      if (!qrCode) {
        res.json({
          success: false,
          message: 'Código QR no encontrado',
        });
        return;
      }

      if (qrCode.status !== 'activated') {
        res.json({
          success: false,
          message: 'Código QR no activado',
        });
        return;
      }

      // Registrar escaneo en el contador de vistas
      if (qrCode.assignedPet) {
        await Pet.findByIdAndUpdate(qrCode.assignedPet as any, {
          $push: {
            petViewCounter: {
              lat: lat || '',
              lng: lng || '',
              dateViewed: new Date().toISOString(),
            },
          },
        });
      }

      // Filtrar información según permisos
      const user = qrCode.assignedTo as any;
      const pet = qrCode.assignedPet as any;

      const responseData = {
        success: true,
        pet: {
          petName: pet?.petName,
          breed: pet?.breed,
          photo: pet?.photo,
          birthDate: pet?.permissions?.showBirthDate
            ? pet.birthDate
            : undefined,
          address: pet?.permissions?.showAddressInfo ? pet.address : undefined,
        },
        owner: {
          name: user?.permissions?.showPersonalInfo ? user.name : undefined,
          phone: user?.permissions?.showPhoneInfo ? user.phone : undefined,
          email: user?.permissions?.showEmailInfo ? user.email : undefined,
        },
        veterinarian: {
          contact: pet?.permissions?.showVeterinarianContact
            ? pet.veterinarianContact
            : undefined,
          phone: pet?.permissions?.showPhoneVeterinarian
            ? pet.phoneVeterinarian
            : undefined,
        },
      };

      res.json(responseData);
    } catch (error) {
      console.error('Error escaneando QR:', error);
      res.json({
        success: false,
        message: 'Error escaneando código QR',
      });
    }
  },

  // 📈 ADMIN: Obtener estadísticas de QR codes
  getQRStats: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const results = await QrCode.aggregate([
        {
          $facet: {
            // Estadísticas por status
            statusStats: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalValue: { $sum: '$purchaseInfo.price' },
                },
              },
              {
                $sort: { _id: 1 },
              },
            ],
            // Total de códigos
            totalCount: [{ $count: 'total' }],
            // Revenue de status específicos
            revenue: [
              {
                $match: {
                  status: { $in: ['assigned', 'activated'] },
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: '$purchaseInfo.price' },
                },
              },
            ],
          },
        },
      ]);

      const statusStats = results[0].statusStats;
      const totalCodes = results[0].totalCount[0]?.total || 0;
      const totalRevenue = results[0].revenue[0]?.total || 0;

      // Asegurar que todos los status estén presentes
      const statusList = ['pending', 'available', 'assigned', 'activated'];
      const completeStatusStats = statusList.map((status) => {
        const foundStatus = statusStats.find(
          (stat: any) => stat._id === status
        );
        return {
          status,
          count: foundStatus?.count || 0,
          totalValue: foundStatus?.totalValue || 0,
        };
      });

      res.json({
        success: true,
        payload: {
          totalCodes,
          totalRevenue,
          byStatus: completeStatusStats,
        },
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
      });
    }
  },

  // 🐕 ADMIN: Obtener todos los QR registrados
  getAllQrCodeList: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'asc',
        search = '',
        startDate = '',
        endDate = '',
        ...filters
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Construir query de búsqueda
      let query: any = {};

      // Búsqueda por texto
      if (search) {
        query.$or = [
          { randomCode: { $regex: search, $options: 'i' } },
          { hostName: { $regex: search, $options: 'i' } },
          { 'purchaseInfo.seller': { $regex: search, $options: 'i' } },
        ];
      }

      // Filtros de tabla
      const tableFilters = filters as IQrCodeTableFilters;

      // Filtro por estado - EXCLUIR cuando sea 'all'
      if (tableFilters.status && tableFilters.status.length > 0) {
        // Si el array incluye 'all', no aplicar filtro de status
        if (!tableFilters.status.includes('all')) {
          query.status = { $in: tableFilters.status };
        }
        // Si incluye 'all', no se agrega query.status (retorna todos)
      }

      // Filtro por usuario asignado
      if (tableFilters.assignedTo && tableFilters.assignedTo.length > 0) {
        query.assignedTo = { $in: tableFilters.assignedTo };
      }

      // Filtro por usuario que activó
      if (tableFilters.activatedBy && tableFilters.activatedBy.length > 0) {
        query.activatedBy = { $in: tableFilters.activatedBy };
      }

      // Filtro por host name
      if (tableFilters.hostName && tableFilters.hostName.length > 0) {
        query.hostName = { $in: tableFilters.hostName };
      }

      // Filtro por fecha de creación (siguiendo el mismo patrón del segundo código)
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate as string);
        }
      }

      // Ejecutar consulta
      const [qrCodes, total] = await Promise.all([
        QrCode.find(query)
          .populate('assignedTo', 'name email') // Campos específicos del usuario asignado
          .populate('assignedPet', 'name breed') // Campos específicos de la mascota
          .populate('activatedBy', 'name email') // Campos específicos del usuario que activó
          .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limitNum)
          .exec(),
        QrCode.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        payload: qrCodes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  updateQRCode: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        status,
        // assignedTo,
        // assignedPet,
        activationDate,
        randomCode,
        hostName,
        id,
      }: IQrCode = req.body;

      const qrCode = await QrCode.findById(id);

      if (!qrCode) {
        res.json({
          success: false,
          message: 'Código QR no encontrado',
        });
        return;
      }

      // Actualizar campos
      qrCode.status = status;
      // qrCode.assignedTo = assignedTo;
      // qrCode.assignedPet = assignedPet;
      qrCode.activationDate = activationDate;
      qrCode.randomCode = randomCode;
      qrCode.hostName = hostName;
      await qrCode.save();

      res.json({
        success: true,
        message: 'Código QR actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error actualizando código QR:', error);
      // res.json({
      //   success: false,
      //   message: 'Error actualizando código QR',
      // });
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'An error occurred while fetching Qr Code.',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
      res.status(500).json(errorResponse);
    }
  },
};

export default qrCodeController;
