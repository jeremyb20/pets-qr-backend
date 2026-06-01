// controllers/admin/promotion.controller.ts
import { Request, Response, NextFunction } from 'express';
import Promotion, { IPromotion } from '../../models/Promotions.model';
import { Types } from 'mongoose';

interface UpdatePromotionRequest extends Partial<IPromotion> {
  status?: 'active' | 'inactive' | 'expired';
}

export class PromotionController {
  // Crear una nueva promoción
  async createPromotion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        title,
        description,
        discount,
        validFrom,
        validUntil,
        urlImage,
        urlImageId,
        icon,
        type,
        priority,
        termsAndConditions,
        applicableTo,
        code,
        usageLimit,
        link,
        customIMG,
        isExternalLink,
        buttonTextRedirect,
      } = req.body as IPromotion;

      // Validar campos requeridos
      if (!title || !description || !discount || !validFrom || !validUntil) {
        res.status(400).json({
          success: false,
          message:
            'Missing required fields: title, description, discount, validFrom, validUntil',
        });
        return;
      }

      // Validar descuento
      if (discount < 0 || discount > 100) {
        res.status(400).json({
          success: false,
          message: 'Discount must be between 0 and 100',
        });
        return;
      }

      // Validar fechas
      const fromDate = new Date(validFrom);
      const untilDate = new Date(validUntil);

      if (fromDate >= untilDate) {
        res.status(400).json({
          success: false,
          message: 'validFrom must be before validUntil',
        });
        return;
      }

      // Verificar si el código promocional ya existe
      if (code) {
        const existingPromotion = await Promotion.findOne({ code });
        if (existingPromotion) {
          res.status(400).json({
            success: false,
            message: 'Promotion code already exists',
          });
          return;
        }
      }

      const promotion = new Promotion({
        title,
        description,
        discount,
        validFrom: fromDate,
        validUntil: untilDate,
        urlImage,
        urlImageId,
        icon: icon || 'mdi:tag',
        type: type || 'general',
        priority: priority || 0,
        termsAndConditions,
        applicableTo: applicableTo || [],
        code,
        usageLimit,
        usedCount: 0,
        link: link,
        customIMG: customIMG || null,
        isExternalLink,
        buttonTextRedirect: buttonTextRedirect || null,
        status:
          fromDate <= new Date() && untilDate >= new Date()
            ? 'active'
            : 'inactive',
      });

      await promotion.save();

      res.status(201).json({
        success: true,
        payload: promotion,
        message: 'Promotion created successfully',
      });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Obtener todas las promociones (con paginación)
  async getAllPromotions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = '1',
        limit = '10',
        status = '',
        type = '',
        search = '',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filters: any = {};
      if (status) filters.status = status;
      if (type) filters.type = type;
      if (search) {
        filters.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
        ];
      }

      const [promotions, total] = await Promise.all([
        Promotion.find(filters)
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Promotion.countDocuments(filters),
      ]);

      res.json({
        success: true,
        payload: promotions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Obtener una promoción por ID
  async getPromotionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid promotion ID',
        });
        return;
      }

      const promotion = await Promotion.findById(id);

      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Promotion not found',
        });
        return;
      }

      res.json({
        success: true,
        payload: promotion,
      });
    } catch (error) {
      console.error('Error fetching promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Actualizar una promoción
  async updatePromotion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body as UpdatePromotionRequest;

      if (!Types.ObjectId.isValid(id as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid promotion ID',
        });
        return;
      }

      const promotion = await Promotion.findById(id);
      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Promotion not found',
        });
        return;
      }

      // Validar fechas si se actualizan
      if (updates.validFrom || updates.validUntil) {
        const fromDate = updates.validFrom
          ? new Date(updates.validFrom)
          : promotion.validFrom;
        const untilDate = updates.validUntil
          ? new Date(updates.validUntil)
          : promotion.validUntil;

        if (fromDate >= untilDate) {
          res.status(400).json({
            success: false,
            message: 'validFrom must be before validUntil',
          });
          return;
        }
      }

      // Actualizar campos
      Object.keys(updates).forEach((key) => {
        if (key !== 'usedCount') {
          (promotion as any)[key] =
            updates[key as keyof UpdatePromotionRequest];
        }
      });

      // Actualizar status automáticamente basado en fechas
      const now = new Date();
      if (promotion.validFrom <= now && promotion.validUntil >= now) {
        promotion.status = 'active';
      } else if (promotion.validUntil < now) {
        promotion.status = 'expired';
      }

      await promotion.save();

      res.json({
        success: true,
        payload: promotion,
        message: 'Promotion updated successfully',
      });
    } catch (error) {
      console.error('Error updating promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Eliminar una promoción
  async deletePromotion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid promotion ID',
        });
        return;
      }

      const promotion = await Promotion.findByIdAndDelete(id);

      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Promotion not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Promotion deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Obtener promociones activas para usuarios (público)
  async getActivePromotions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { type, limit = '5' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      const currentDate = new Date();

      // Crear una copia sin milisegundos para comparación más precisa
      const currentDateWithoutMs = new Date(currentDate);
      currentDateWithoutMs.setMilliseconds(0);

      console.log('Original date:', currentDate.toISOString());
      console.log('Date without ms:', currentDateWithoutMs.toISOString());

      const filters: any = {
        status: 'active',
        $and: [
          { validFrom: { $lte: currentDateWithoutMs } },
          { validUntil: { $gte: currentDateWithoutMs } },
        ],
      };

      if (type) filters.type = type;

      const promotions = await Promotion.find(filters)
        .sort({ priority: -1, createdAt: -1 })
        .limit(limitNum);

      console.log(`Found ${promotions.length} active promotions`);

      res.json({
        success: true,
        payload: promotions,
      });
    } catch (error) {
      console.error('Error fetching active promotions:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
  // Obtener promoción destacada (la de mayor prioridad)
  async getFeaturedPromotion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const promotion = await Promotion.getFeaturedPromotion();

      res.json({
        success: true,
        payload: promotion || null,
      });
    } catch (error) {
      console.error('Error fetching featured promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Validar y usar un código promocional
  async validatePromoCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.params;

      const promotion = await Promotion.findOne({ code, status: 'active' });

      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Invalid or expired promotion code',
        });
        return;
      }

      const now = new Date();
      if (promotion.validFrom > now || promotion.validUntil < now) {
        res.status(400).json({
          success: false,
          message: 'Promotion code is not valid at this time',
        });
        return;
      }

      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        res.status(400).json({
          success: false,
          message: 'Promotion code has reached its usage limit',
        });
        return;
      }

      res.json({
        success: true,
        payload: {
          id: promotion.id,
          title: promotion.title,
          description: promotion.description,
          discount: promotion.discount,
          type: promotion.type,
          validUntil: promotion.validUntil,
        },
      });
    } catch (error) {
      console.error('Error validating promo code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Registrar uso de un código promocional
  async usePromoCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.params;

      const promotion = await Promotion.findOne({ code, status: 'active' });

      if (!promotion) {
        res.status(404).json({
          success: false,
          message: 'Invalid or expired promotion code',
        });
        return;
      }

      const now = new Date();
      if (promotion.validFrom > now || promotion.validUntil < now) {
        res.status(400).json({
          success: false,
          message: 'Promotion code is not valid at this time',
        });
        return;
      }

      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        res.status(400).json({
          success: false,
          message: 'Promotion code has reached its usage limit',
        });
        return;
      }

      promotion.usedCount += 1;
      await promotion.save();

      res.json({
        success: true,
        payload: {
          id: promotion.id,
          discount: promotion.discount,
          usedCount: promotion.usedCount,
        },
        message: 'Promotion code applied successfully',
      });
    } catch (error) {
      console.error('Error using promo code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
}

export default new PromotionController();
