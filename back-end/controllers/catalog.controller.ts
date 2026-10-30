import { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import Catalog, { ICatalog, ICatalogImage } from '../models/catalog';
import {
  deleteImage,
  uploadImage,
  uploadImageFromBuffer,
} from '../services/r2';

const uploadCatalogImage = async (req: Request) => {
  if (req.file) {
    return uploadImageFromBuffer(req.file.buffer, { folder: 'catalog' });
  }

  const image = req.body.image;
  if (typeof image === 'string' && /^https?:\/\//.test(image)) {
    return { imageId: '', imageUrl: image };
  }

  return uploadImage(image, { folder: 'catalog' });
};

// Interfaces para los tipos
interface CatalogResponse {
  success: boolean;
  message?: string;
  msg?: string;
  payload?: any;
  error?: any;
}

interface CreateCatalogRequest {
  code: string;
  productName: string;
  description: string;
  price: string; // Cambiado a string según el schema
  quantity: string; // Cambiado a string según el schema
  inventoryStatus: string;
  category: string;
  rating: string; // Cambiado a string según el schema
  idOwner: string;
  metaDescription: string;
  phone: string;
  country: string;
  image?: string;
}

interface CatalogController {
  getAllInventoryList(req: Request, res: Response): Promise<void>;
  getCatalogList(req: Request, res: Response): Promise<void>;
  getPromoList(req: Request, res: Response): Promise<void>;
  createCatalog(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  getCatalogById(req: Request, res: Response): Promise<void>;
  editCatalog(req: Request, res: Response): Promise<void>;
  deleteCatalog(req: Request, res: Response): Promise<void>;
  addCatalogImages(req: Request, res: Response): Promise<void>;
  deleteImageCatalog(req: Request, res: Response): Promise<void>;
}

const catalogCtl: CatalogController = {
  getAllInventoryList: async (_req: Request, res: Response): Promise<void> => {
    const catalog: ICatalog[] = await Catalog.find();
    if (catalog.length == 0) {
      res.json({
        success: false,
        message: 'No hay lista de catálogos disponibles',
      });
    } else {
      res.json({ payload: catalog, success: true });
    }
  },

  getCatalogList: async (_req: Request, res: Response): Promise<void> => {
    const catalog: ICatalog[] = await Catalog.find();
    if (catalog.length == 0) {
      res.json({
        success: false,
        message: 'No hay lista de catálogos disponibles',
      });
    } else {
      const data: ICatalog[] = [];
      catalog.forEach((element) => {
        if (element.images.length > 0) {
          data.push(element);
        }
      });
      res.json({ payload: data, success: true });
    }
  },

  getPromoList: async (_req: Request, res: Response): Promise<void> => {
    const catalog: ICatalog[] = await Catalog.find();
    if (catalog.length == 0) {
      res.json({
        success: false,
        message: 'No hay lista de promociones disponibles',
      });
    } else {
      const data: ICatalog[] = [];
      catalog.forEach((element) => {
        if (element.inventoryStatus === 'PROMOTION') {
          if (element.images.length > 0) {
            data.push(element);
          }
        }
      });
      res.json({ payload: data, success: true });
    }
  },

  createCatalog: async (
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void> => {
    const {
      code,
      productName,
      description,
      price,
      quantity,
      inventoryStatus,
      category,
      rating,
      idOwner,
      metaDescription,
      phone,
      country,
    } = req.body as CreateCatalogRequest;

    try {
      const result = await uploadCatalogImage(req);

      const dataImage: ICatalogImage = {
        image_id: result.imageId,
        imageURL: result.imageUrl,
      };

      const catalog = new Catalog({
        code,
        productName,
        description,
        price,
        quantity,
        inventoryStatus,
        category,
        rating,
        idOwner,
        metaDescription,
        phone,
        country,
        images: [dataImage],
      });

      await catalog.save();

      if (req.file) {
        await fs.unlink(req.file.path);
      }

      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  getCatalogById: async (req: Request, res: Response): Promise<void> => {
    try {
      const catalogInfo: ICatalog | null = await Catalog.findById(req.query.id);
      if (catalogInfo) {
        res.send({ success: true, payload: catalogInfo });
      } else {
        res.send({
          success: false,
          payload: [],
          message: 'Product not available',
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  editCatalog: async (req: Request, res: Response): Promise<void> => {
    try {
      await Catalog.findByIdAndUpdate(req.body._id, req.body);
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  deleteCatalog: async (req: Request, res: Response): Promise<void> => {
    try {
      const photo: ICatalog | null = await Catalog.findByIdAndDelete(
        req.query.id
      );
      if (photo && photo.images && photo.images.length > 0) {
        await deleteImage(photo.images[0].image_id);
      }
      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  addCatalogImages: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await uploadCatalogImage(req);

      const dataImage: ICatalogImage = {
        image_id: result.imageId,
        imageURL: result.imageUrl,
      };

      if (req.file) {
        await fs.unlink(req.file.path);
      }

      await Catalog.findOneAndUpdate(
        { _id: req.body._id },
        { $push: { images: dataImage } }
      );

      res.send({
        message: 'The information was updated correctly',
        success: true,
        payload: dataImage,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },

  deleteImageCatalog: async (req: Request, res: Response): Promise<void> => {
    try {
      await Catalog.findOneAndUpdate(
        { _id: req.body._id },
        { $pull: { images: { _id: req.body.imageID } } },
        { safe: true, multi: false }
      );

      if (req.body.imageCloud) {
        await deleteImage(req.body.imageCloud);
      }

      res.send({
        message: 'The information was updated correctly',
        success: true,
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'An error occurred in the process.',
        error: JSON.parse(JSON.stringify(error)),
      });
    }
  },
};

export default catalogCtl;
