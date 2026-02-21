import { Request, Response, NextFunction } from 'express';
import { Product } from '../../models/Product.model';
import { ProductReview } from '../../models/ProductReview.model';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateReviewDto,
} from '../../dtos/product.dtos';
import {
  IProductFilters,
  IProductImage,
  IProductTableFilters,
} from '../../types/product.types';

import cloudinary from '../../config/cloudinary.config';
// import { AdminProductController } from '@/types/admin.types';
import { AdminProductController } from '../../types/admin.types';

const adminProductCtl: AdminProductController = {
  /**
   * Obtener todos los productos (para tabla admin con paginación/filtros)
   */
  async getAllProductList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        startDate = '',
        endDate = '',
        search = '',
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
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ];
      }

      // Filtros de tabla
      const tableFilters = filters as IProductTableFilters;

      if (tableFilters.publish && tableFilters.publish.length > 0) {
        query.publish = { $in: tableFilters.publish };
      }

      if (tableFilters.stock && tableFilters.stock.length > 0) {
        query.inventoryType = { $in: tableFilters.stock };
      }

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
      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('reviews')
          .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limitNum)
          .exec(),
        Product.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        payload: products,
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

  /**
   * Obtener productos con filtros para catálogo
   */
  async getProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = req.query as unknown as IProductFilters;

      let query = Product.find({ publish: 'published' }).populate('reviews');

      // Aplicar filtros
      if (filters.category) {
        query = query.where('category').equals(filters.category);
      }

      if (filters.gender && filters.gender.length > 0) {
        query = query.where('gender').in(filters.gender);
      }

      if (filters.colors && filters.colors.length > 0) {
        query = query.where('colors').in(filters.colors);
      }

      if (filters.priceRange && filters.priceRange.length === 2) {
        query = query
          .where('price')
          .gte(filters.priceRange[0])
          .lte(filters.priceRange[1]);
      }

      if (filters.rating) {
        const minRating = parseInt(filters.rating);
        query = query.where('totalRatings').gte(minRating);
      }

      const products = await query.exec();

      res.json({
        success: true,
        data: products,
        total: products.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Obtener producto por ID
   */
  async getProductById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.query;
      const product = await Product.findOne({ productId: id })
        .populate({
          path: 'reviews',
          options: { sort: { postedAt: -1 } },
        })
        .exec();

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        payload: product,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Lo sentimos el producto no ha sido encontrado',
      });
    }
  },

  /**
   * Crear nuevo producto
   */

  async createProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // USAR req.body DIRECTAMENTE COMO EN EL UPDATE
      const productData = { ...req.body };
      const fieldsToParse = [
        'saleLabel',
        'newLabel',
        'tags',
        'colors',
        'sizes',
        'gender',
        'existingImages', // ← Incluir también para consistencia
      ];

      fieldsToParse.forEach((field) => {
        if (productData[field] && typeof productData[field] === 'string') {
          try {
            const parsedValue = JSON.parse(productData[field]);
            productData[field] = parsedValue;
            // console.log(`✅ Parseado ${field}:`, productData[field]);
          } catch (e) {
            console.warn(`⚠️ Error parsing ${field}:`, e);
            // Mantener el valor original si falla el parseo
          }
        }
      });

      // Convertir números (igual que en update)
      const numberFields = ['price', 'priceSale', 'quantity', 'taxes'];
      numberFields.forEach((field) => {
        if (productData[field] !== undefined && productData[field] !== null) {
          productData[field] = Number(productData[field]);
        }
      });

      // Obtener archivos de Multer (igual que en update)
      const imageFiles = (req.files as Express.Multer.File[]) || [];
      console.log('🆕 Archivos recibidos:', imageFiles.length);

      let productImages: IProductImage[] = [];

      // Subir imágenes a Cloudinary (similar al update)
      if (imageFiles.length > 0) {
        console.log(
          `📸 Subiendo ${imageFiles.length} imágenes a Cloudinary...`
        );

        for (const file of imageFiles) {
          try {
            const result = await cloudinary.uploader.upload(
              `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
              {
                folder: 'products',
                resource_type: 'image',
              }
            );

            productImages.push({
              image_id: result.public_id,
              imageURL: result.secure_url,
            });

            console.log(`✅ Imagen subida: ${result.secure_url}`);
          } catch (uploadError) {
            console.error('❌ Error subiendo imagen:', uploadError);
          }
        }
      }

      // Obtener imágenes existentes (para consistencia con update)
      const existingImages = productData.existingImages || [];

      // Combinar imágenes (en create normalmente solo habrá nuevas)
      const allImages = [...existingImages, ...productImages];
      console.log(`🖼️ Total de imágenes: ${allImages.length}`);

      // Determinar cover image (igual que en update)
      let coverUrl = productData.coverUrl;
      if (!coverUrl && allImages.length > 0) {
        coverUrl = allImages[0].imageURL;
      }

      // Validar priceSale (igual que en update)
      let priceSale = productData.priceSale;
      //   const price = productData.price;
      // if (priceSale && priceSale >= price) {
      //   console.warn(
      //     '⚠️ priceSale debe ser menor que price. Estableciendo a null'
      //   );
      //   priceSale = null;
      // }

      const generateProductId = async (): Promise<string> => {
        let productId: string;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 100) {
          productId = Math.floor(100000 + Math.random() * 900000).toString();
          const existingProduct = await Product.findOne({ productId });
          if (!existingProduct) isUnique = true;
          attempts++;
        }

        if (!isUnique) throw new Error('No se pudo generar productId único');
        return productId!;
      };

      // Crear el DTO con la misma lógica del update
      const createProductDto = new CreateProductDto({
        ...productData,
        priceSale: priceSale,
        images: allImages,
        coverUrl: coverUrl,
        productId: await generateProductId(),
        // Asegurar que los labels sean objetos (igual que en update)
        saleLabel:
          typeof productData.saleLabel === 'object'
            ? productData.saleLabel
            : { enabled: false, content: '' },
        newLabel:
          typeof productData.newLabel === 'object'
            ? productData.newLabel
            : { enabled: false, content: '' },
      });

      console.log('💾 Guardando producto en base de datos...');
      console.log('📊 Datos procesados:', {
        tags: createProductDto.tags,
        colors: createProductDto.colors,
        sizes: createProductDto.sizes,
        gender: createProductDto.gender,
      });

      // Crear el producto
      const product = new Product({
        ...createProductDto,
        available: createProductDto.quantity,
      });

      await product.save();

      // Populate para devolver datos completos
      const populatedProduct = await Product.findById(product._id)
        .populate('reviews')
        .exec();

      console.log('✅ Producto creado exitosamente');

      res.status(201).json({
        success: true,
        data: populatedProduct,
        message: 'Producto creado exitosamente',
      });
    } catch (error: any) {
      console.error('❌ Error creating product:', error);

      if ((error as any).code === 11000) {
        res.status(400).json({
          success: false,
          message: 'El SKU o código ya existe',
        });
        return;
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
  /**
   * Actualizar producto
   */

  async updateProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Obtener ID directamente del body (ya que viene como campo separado)
      const id = req.body.id;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID del producto es requerido',
        });
        return;
      }

      // Obtener producto existente
      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      // Los datos vienen directamente en req.body, no en req.body.data
      const productData = { ...req.body };

      // Parsear campos específicos que pueden venir como strings JSON
      const fieldsToParse = [
        'saleLabel',
        'newLabel',
        'tags',
        'colors',
        'sizes',
        'existingImages', // ← También parsear existingImages si viene como string
      ];

      fieldsToParse.forEach((field) => {
        if (productData[field] && typeof productData[field] === 'string') {
          try {
            const parsedValue = JSON.parse(productData[field]);
            productData[field] = parsedValue;
            // console.log(`✅ Parseado ${field}:`, productData[field]);
          } catch (e) {
            console.warn(`⚠️ Error parsing ${field}:`, e);
            // Mantener el valor original si falla el parseo
          }
        }
      });

      // Convertir números
      const numberFields = ['price', 'priceSale', 'quantity', 'taxes'];
      numberFields.forEach((field) => {
        if (productData[field] !== undefined && productData[field] !== null) {
          productData[field] = Number(productData[field]);
        }
      });

      // Obtener imágenes existentes
      let existingImages: any[] =
        productData.existingImages || existingProduct.images || [];

      // Obtener archivos nuevos de Multer
      const newImageFiles = (req.files as Express.Multer.File[]) || [];
      console.log('🆕 Archivos nuevos recibidos:', newImageFiles.length);

      let newProductImages: IProductImage[] = [];

      // Subir nuevas imágenes a Cloudinary si hay archivos
      if (newImageFiles.length > 0) {
        console.log(
          `📸 Subiendo ${newImageFiles.length} nuevas imágenes a Cloudinary...`
        );

        for (const file of newImageFiles) {
          try {
            const result = await cloudinary.uploader.upload(
              `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
              {
                folder: 'products',
                resource_type: 'image',
              }
            );

            newProductImages.push({
              image_id: result.public_id,
              imageURL: result.secure_url,
            });

            console.log(`✅ Nueva imagen subida: ${result.secure_url}`);
          } catch (uploadError) {
            console.error('❌ Error subiendo nueva imagen:', uploadError);
          }
        }
      }

      // Combinar imágenes existentes con las nuevas
      const allImages = [...existingImages, ...newProductImages];
      console.log(`🖼️ Total de imágenes: ${allImages.length}`);

      // Determinar cover image
      let coverUrl = productData.coverUrl;
      if (!coverUrl && allImages.length > 0) {
        coverUrl = allImages[0].imageURL;
      }
      if (!coverUrl && existingProduct.coverUrl) {
        coverUrl = existingProduct.coverUrl;
      }

      // Validar priceSale
      let priceSale = productData.priceSale;
      // const price = productData.price;
      // if (priceSale && priceSale >= price) {
      //   console.warn(
      //     '⚠️ priceSale debe ser menor que price. Estableciendo a null'
      //   );
      //   priceSale = null;
      // }

      // Crear el DTO con los datos actualizados
      const updateProductDto = new UpdateProductDto({
        ...productData,
        priceSale: priceSale,
        images: allImages,
        coverUrl: coverUrl,
        // Asegurar que los labels sean objetos
        saleLabel:
          typeof productData.saleLabel === 'object'
            ? productData.saleLabel
            : { enabled: false, content: '' },
        newLabel:
          typeof productData.newLabel === 'object'
            ? productData.newLabel
            : { enabled: false, content: '' },
      });

      console.log('💾 Actualizando producto...');

      // Eliminar campos que no deben actualizarse en la BD
      const updateData = { ...updateProductDto };
      delete (updateData as any).id;
      delete (updateData as any).existingImages;

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
          ...updateData,
          available: updateProductDto.quantity,
        },
        { new: true, runValidators: true }
      )
        .populate('reviews')
        .exec();

      if (!updatedProduct) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado para actualizar',
        });
        return;
      }

      console.log('✅ Producto actualizado exitosamente');

      res.status(200).json({
        success: true,
        data: updatedProduct,
        message: 'Producto actualizado exitosamente',
      });
    } catch (error: any) {
      console.error('❌ Error updating product:', error);

      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          message: 'El SKU o código ya existe',
        });
        return;
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },

  /**
   * Eliminar producto
   */
  async deleteProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndDelete(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      // Eliminar reviews asociados
      await ProductReview.deleteMany({ _id: { $in: product.reviews } });

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Eliminar múltiples productos
   */
  async bulkDeleteProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Se requieren IDs de productos',
        });
        return;
      }

      const result = await Product.deleteMany({ _id: { $in: ids } });

      if (result.deletedCount === 0) {
        res.status(404).json({
          success: false,
          message: 'No se encontraron productos para eliminar',
        });
        return;
      }

      // Eliminar reviews asociados
      await ProductReview.deleteMany({ product: { $in: ids } });

      res.json({
        success: true,
        message: `${result.deletedCount} producto(s) eliminado(s) exitosamente`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Obtener reviews de un producto
   */
  async getProductReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { productId } = req.params;

      const reviews = await ProductReview.find({ product: productId })
        .sort({ postedAt: -1 })
        .exec();

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Crear review para producto
   */
  async createProductReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { productId } = req.params;
      const reviewData = new CreateReviewDto(req.body);

      // Verificar que el producto existe
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
        return;
      }

      // Crear review
      const review = new ProductReview({
        ...reviewData,
        comment: reviewData.review,
        product: productId,
      });
      await review.save();

      // Actualizar estadísticas del producto
      await Product.findByIdAndUpdate(productId, {
        $push: { reviews: review._id },
        $inc: {
          totalReviews: 1,
          totalRatings: reviewData.rating || 0,
        },
      });

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review creado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Actualizar review
   */
  async updateProductReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { reviewId } = req.params;
      const updateData = new UpdateProductDto(req.body);

      const review = await ProductReview.findByIdAndUpdate(
        reviewId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: review,
        message: 'Review actualizado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Eliminar review
   */
  async deleteProductReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { reviewId, productId } = req.params;

      const review = await ProductReview.findByIdAndDelete(reviewId);

      if (!review) {
        res.status(404).json({
          success: false,
          message: 'Review no encontrado',
        });
        return;
      }

      // Remover review del producto
      if (productId) {
        await Product.findByIdAndUpdate(productId, {
          $pull: { reviews: reviewId },
        });
      }

      res.json({
        success: true,
        message: 'Review eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Obtener estadísticas de productos
   */
  async getProductStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalPublished: {
              $sum: { $cond: [{ $eq: ['$publish', 'published'] }, 1, 0] },
            },
            totalDraft: {
              $sum: { $cond: [{ $eq: ['$publish', 'draft'] }, 1, 0] },
            },
            totalInventory: { $sum: '$quantity' },
            totalSold: { $sum: '$totalSold' },
            totalRevenue: { $sum: { $multiply: ['$price', '$totalSold'] } },
            averagePrice: { $avg: '$price' },
            averageRating: { $avg: '$totalRatings' },
          },
        },
        {
          $project: {
            _id: 0,
            totalProducts: 1,
            totalPublished: 1,
            totalDraft: 1,
            totalInventory: 1,
            totalSold: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            averagePrice: { $round: ['$averagePrice', 2] },
            averageRating: { $round: ['$averageRating', 2] },
          },
        },
      ]);

      const categoryStats = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalSold: { $sum: '$totalSold' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const inventoryStats = await Product.aggregate([
        {
          $group: {
            _id: '$inventoryType',
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {},
          categories: categoryStats,
          inventory: inventoryStats,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  getAdminProductStats: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;

      const results = await Product.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(lastYear, 0, 1), // Desde enero del año pasado
            },
          },
        },
        {
          $facet: {
            // Total de productos
            totalCount: [{ $count: 'total' }],

            // Productos por categoría
            byCategory: [
              {
                $group: {
                  _id: '$category',
                  count: { $sum: 1 },
                  avgPrice: { $avg: '$price' },
                  totalValue: { $sum: '$price' },
                },
              },
              {
                $sort: { count: -1 },
              },
            ],

            // Productos por estado
            byStatus: [
              {
                $match: { status: { $exists: true, $ne: null } },
              },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],

            // Stock bajo (menos de 10 unidades)
            lowStock: [
              {
                $match: {
                  stock: { $lt: 10, $gte: 0 },
                },
              },
              {
                $count: 'count',
              },
            ],

            // Productos sin stock
            outOfStock: [
              {
                $match: { stock: 0 },
              },
              {
                $count: 'count',
              },
            ],

            // Registros por mes de los últimos 2 años
            byMonth: [
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                  },
                  count: { $sum: 1 },
                },
              },
              {
                $match: {
                  $or: [{ '_id.year': currentYear }, { '_id.year': lastYear }],
                },
              },
              {
                $sort: { '_id.year': 1, '_id.month': 1 },
              },
            ],
          },
        },
      ]);

      const totalProducts = results[0].totalCount[0]?.total || 0;
      const byCategory = results[0].byCategory || [];
      const byStatus = results[0].byStatus || [];
      const lowStock = results[0].lowStock[0]?.count || 0;
      const outOfStock = results[0].outOfStock[0]?.count || 0;
      const byMonth = results[0].byMonth || [];

      res.json({
        success: true,
        payload: {
          totalProducts,
          byCategory,
          byStatus,
          lowStock,
          outOfStock,
          byMonth,
          date: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de productos:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
  getProductGrowth: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [totalProducts, newThisMonth, newLastMonth] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Product.countDocuments({
          createdAt: {
            $gte: lastMonth,
            $lt: startOfMonth,
          },
        }),
      ]);

      const monthlyGrowth =
        newLastMonth > 0
          ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)
          : newThisMonth > 0
            ? '100.0'
            : '0.0';

      res.json({
        success: true,
        payload: {
          total: totalProducts,
          newThisMonth,
          monthlyGrowth: parseFloat(monthlyGrowth),
        },
      });
    } catch (error) {
      console.error('Error obteniendo crecimiento de productos:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
        error: (error as Error).message,
      });
    }
  },
};

export default adminProductCtl;
