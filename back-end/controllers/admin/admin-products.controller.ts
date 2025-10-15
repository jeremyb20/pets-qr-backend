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
      const product = await Product.findById(id)
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
      next(error);
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
      // Procesar datos del producto - CORREGIDO para FormData
      let productData: any;
      if (req.body.data) {
        try {
          productData = JSON.parse(req.body.data);

          // Parsear campos específicos - VERSIÓN CORREGIDA
          const fieldsToParse = [
            'saleLabel',
            'newLabel',
            'tags',
            'colors',
            'sizes',
          ];

          fieldsToParse.forEach((field) => {
            if (typeof productData[field] === 'string') {
              try {
                const parsedValue = JSON.parse(productData[field]);

                // CORRECCIÓN: Si es un array con un solo elemento que es otro array, extraerlo
                if (
                  Array.isArray(parsedValue) &&
                  parsedValue.length === 1 &&
                  Array.isArray(parsedValue[0])
                ) {
                  productData[field] = parsedValue[0];
                  console.log(`🔄 Corregido ${field}:`, productData[field]);
                } else {
                  productData[field] = parsedValue;
                }
              } catch (e) {
                console.warn(`⚠️ Error parsing ${field}:`, e);
              }
            }
          });

          // Convertir números
          const numberFields = ['price', 'priceSale', 'quantity', 'taxes'];
          numberFields.forEach((field) => {
            if (productData[field]) {
              productData[field] = Number(productData[field]);
            }
          });

          // // Parsear los campos que vienen como strings desde FormData
          // if (typeof productData.saleLabel === 'string') {
          //   productData.saleLabel = JSON.parse(productData.saleLabel);
          // }
          // if (typeof productData.newLabel === 'string') {
          //   productData.newLabel = JSON.parse(productData.newLabel);
          // }
          // if (typeof productData.tags === 'string') {
          //   productData.tags = JSON.parse(productData.tags);
          // }
          // if (typeof productData.colors === 'string') {
          //   productData.colors = JSON.parse(productData.colors);
          // }
          // if (typeof productData.sizes === 'string') {
          //   productData.sizes = JSON.parse(productData.sizes);
          // }
          // // Convertir números
          // if (productData.price) productData.price = Number(productData.price);
          // if (productData.priceSale)
          //   productData.priceSale = Number(productData.priceSale);
          // if (productData.quantity)
          //   productData.quantity = Number(productData.quantity);
          // if (productData.taxes) productData.taxes = Number(productData.taxes);
        } catch (parseError) {
          console.error('Error parsing JSON data:', parseError);
          productData = req.body;
        }
      } else {
        productData = req.body;
      }

      console.log('🔄 Datos del producto procesados:', productData);

      // Obtener archivos de Multer
      const imageFiles = (req.files as Express.Multer.File[]) || [];
      console.log('🖼️ Archivos recibidos:', imageFiles.length);

      let productImages: IProductImage[] = [];

      // Subir imágenes a Cloudinary si hay archivos
      if (imageFiles.length > 0) {
        console.log(
          `📸 Subiendo ${imageFiles.length} imágenes a Cloudinary...`
        );

        for (const file of imageFiles) {
          try {
            // Subir a Cloudinary usando el buffer
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
            // Continuar con las demás imágenes aunque falle una
          }
        }
      } else {
        console.log('ℹ️ No se recibieron archivos de imagen');
      }

      // La primera imagen será la cover
      console.log(productImages, 'productImages');

      const coverUrl = productImages[0]?.imageURL || productData.coverUrl || '';

      // Validar priceSale
      let priceSale = productData.priceSale;
      const price = productData.price;

      if (priceSale && priceSale >= price) {
        console.warn(
          '⚠️ priceSale debe ser menor que price. Estableciendo a null'
        );
        priceSale = null;
      }

      // Crear el DTO con los datos corregidos
      const createProductDto = new CreateProductDto({
        ...productData,
        gender: productData.gender,
        priceSale: priceSale,
        images: productImages,
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

      console.log('💾 Guardando producto en base de datos...');

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

      // Manejar errores de validación de Mongoose
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
        message: 'Error al crear el producto',
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
            console.log(`✅ Parseado ${field}:`, productData[field]);
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
      const price = productData.price;
      if (priceSale && priceSale >= price) {
        console.warn(
          '⚠️ priceSale debe ser menor que price. Estableciendo a null'
        );
        priceSale = null;
      }

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
        message: `Error al actualizar el producto: ${error.message}`,
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
};

export default adminProductCtl;
