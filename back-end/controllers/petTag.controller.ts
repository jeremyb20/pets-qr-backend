// controllers/pet-tag-order.controller.ts

import { Request, Response, NextFunction } from 'express';
import { PetTagOrder } from '../models/PetTag.model';
import cloudinary from '../config/cloudinary.config';
import { AdminNotificationService } from '../services/adminNotification.service';

export class PetTagOrderController {
  /**
   * Crear una nueva orden de pet tag con imágenes
   */
  static async createOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orderData = { ...req.body };

      // Parsear campos JSON que vienen como string
      const fieldsToParse = ['front', 'back'];
      fieldsToParse.forEach((field) => {
        if (orderData[field] && typeof orderData[field] === 'string') {
          try { orderData[field] = JSON.parse(orderData[field]); }
          catch (e) { console.warn(`⚠️ Error parsing ${field}:`, e); }
        }
      });

      // Subir imágenes a Cloudinary según fieldname (front / back)
      const imageFiles = (req.files as Express.Multer.File[]) || [];
      const uploaded: Record<string, { imageURL: string; imageID: string }> = {};

      for (const file of imageFiles) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { folder: 'pet-tags', resource_type: 'image' }
          );
          uploaded[file.fieldname] = { imageURL: result.secure_url, imageID: result.public_id };
        } catch (uploadError) {
          console.error('❌ Error subiendo imagen:', uploadError);
        }
      }

      // Construir front y back combinando datos + imagen subida
      const front = orderData.front
        ? { ...orderData.front, image: uploaded['frontImage'] ?? orderData.front.image }
        : uploaded['frontImage'] ? { image: uploaded['frontImage'] } : undefined;

      const back = orderData.back
        ? { ...orderData.back, image: uploaded['backImage'] ?? orderData.back.image }
        : uploaded['backImage'] ? { image: uploaded['backImage'] } : undefined;

      const newOrder = new PetTagOrder({
        shape: orderData.shape,
        material: orderData.material,
        size: orderData.size,
        petType: orderData.petType,
        contactName: orderData.contactName,
        contactPhone: orderData.contactPhone,
        contactNote: orderData.contactNote || '',
        ...(front && { front }),
        ...(back && { back }),
      });

      await newOrder.save();

      console.log('✅ Orden de pet tag creada exitosamente');

      AdminNotificationService.notifyNewPetTagOrder(newOrder as any).catch((error) => {
        console.error('Error enviando notificación al admin (no crítico):', error);
      });

      res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Orden de pet tag creada exitosamente',
      });
    } catch (error: any) {
      console.error('❌ Error creando orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la orden de pet tag',
        error: error.message,
      });
    }
  }

  /**
   * Obtener todas las órdenes
   */
  static async getAllOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        type,
        status,
        // priority,
        // category,
        search,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const filters: any = {};

      // Filtros exactos
      if (type) filters.type = type;
      if (status) filters.status = status;

      if (search) {
        filters.$or = [
          { contactName: { $regex: search, $options: 'i' } },
          { contactPhone: { $regex: search, $options: 'i' } },
        ];
      }

      // Filtro por rango de fechas
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate as string);
        if (endDate) filters.createdAt.$lte = new Date(endDate as string);
      }

      // Calcular paginación
      const skip = (Number(page) - 1) * Number(limit);
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      // Obtener feedbacks
      const [feedbacks, total] = await Promise.all([
        PetTagOrder.find(filters)
          .sort(sortOptions)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        PetTagOrder.countDocuments(filters),
      ]);
      res.status(200).json({
        success: true,
        payload: feedbacks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching feedbacks',
      });
    }
  }

  /**
   * Obtener una orden por ID
   */
  static async getOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const order = await PetTagOrder.findById(id);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener la orden',
        error: error.message,
      });
    }
  }

  /**
   * Actualizar una orden
   */
  static async updateOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // 1. Buscar la orden existente
      const existingOrder = await PetTagOrder.findById(id);
      if (!existingOrder) {
        res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
        });
        return;
      }

      // 2. Parsear campos JSON
      const fieldsToParse = ['front', 'back'];
      fieldsToParse.forEach((field) => {
        if (updateData[field] && typeof updateData[field] === 'string') {
          try { updateData[field] = JSON.parse(updateData[field]); }
          catch (e) { console.warn(`⚠️ Error parsing ${field}:`, e); }
        }
      });

      // 3. Procesar nuevas imágenes
      const imageFiles = (req.files as Express.Multer.File[]) || [];
      const uploaded: Record<string, { imageURL: string; imageID: string }> = {};
      for (const file of imageFiles) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { folder: 'pet-tags', resource_type: 'image' }
          );
          uploaded[file.fieldname] = { imageURL: result.secure_url, imageID: result.public_id };
        } catch (uploadError) {
          console.error('❌ Error subiendo imagen:', uploadError);
        }
      }

      if (uploaded['front']) updateData.front = { ...updateData.front, image: uploaded['front'] };
      if (uploaded['back']) updateData.back = { ...updateData.back, image: uploaded['back'] };

      // 4. Actualizar la orden
      const updatedOrder = await PetTagOrder.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        data: updatedOrder,
        message: 'Orden actualizada exitosamente',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la orden',
        error: error.message,
      });
    }
  }

  /**
   * Eliminar una orden (incluyendo imágenes)
   */
  static async deleteOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // 1. Buscar la orden
      const order = await PetTagOrder.findById(id);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Orden no encontrada',
        });
        return;
      }

      // 2. Eliminar imágenes de Cloudinary (front y back)
      const imageIDs = [
        order.front?.image?.imageID,
        order.back?.image?.imageID,
      ].filter(Boolean);
      await Promise.all(imageIDs.map((pid) => cloudinary.uploader.destroy(pid!)));

      // 3. Eliminar de la base de datos
      await PetTagOrder.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Orden eliminada exitosamente',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la orden',
        error: error.message,
      });
    }
  }
}
