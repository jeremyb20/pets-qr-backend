import { Types } from 'mongoose';
import {
  IProductCreate,
  IProductUpdate,
  IProductReviewNewForm,
} from '../types/product.types';

export interface IImageFile {
  path: string;
  preview?: string;
  file?: File; // Para el frontend
}

export class CreateProductDto implements IProductCreate {
  sku: string;
  name: string;
  code: string;
  price: number;
  taxes: number;
  tags: string[];
  gender: string;
  sizes: string[];
  publish: string;
  coverUrl: string;
  images: string[]; // Cambiar a string[] para URLs de Cloudinary
  colors: string[];
  quantity: number;
  category: string;
  available: number;
  totalSold: number;
  description: string;
  totalRatings: number;
  totalReviews: number;
  inventoryType: string;
  subDescription: string;
  priceSale: number | null;
  ratings: {
    name: string;
    starCount: number;
    reviewCount: number;
  }[];
  saleLabel: {
    enabled: boolean;
    content: string;
  };
  newLabel: {
    enabled: boolean;
    content: string;
  };
  reviews?: Types.ObjectId[];
  productId: number;

  // Campo temporal para archivos (no se guarda en BD)
  imageFiles?: Express.Multer.File[];

  constructor(data: Partial<CreateProductDto> = {}) {
    this.sku = data.sku || '';
    this.name = data.name || '';
    this.code = data.code || '';
    this.price = data.price || 0;
    this.taxes = data.taxes || 0;
    this.tags = data.tags || [];
    this.gender = data.gender || '';
    this.sizes = data.sizes || [];
    this.publish = data.publish || 'draft';
    this.coverUrl = data.coverUrl || '';
    this.images = data.images || []; // Esto será reemplazado por URLs de Cloudinary
    this.colors = data.colors || [];
    this.quantity = data.quantity || 0;
    this.category = data.category || '';
    this.available = data.available || 0;
    this.totalSold = data.totalSold || 0;
    this.description = data.description || '';
    this.totalRatings = data.totalRatings || 0;
    this.totalReviews = data.totalReviews || 0;
    this.inventoryType = data.inventoryType || 'in_stock';
    this.subDescription = data.subDescription || '';
    this.priceSale = data.priceSale !== undefined ? data.priceSale : null;
    this.ratings = data.ratings || [];
    this.saleLabel = data.saleLabel || { enabled: false, content: '' };
    this.newLabel = data.newLabel || { enabled: false, content: '' };
    this.reviews = data.reviews || [];
    this.productId = data.productId || 0;

    // Campo para archivos (no se persiste)
    this.imageFiles = (data as any).imageFiles || [];
  }
}

export class UpdateProductDto implements IProductUpdate {
  sku?: string;
  name?: string;
  code?: string;
  price?: number;
  taxes?: number;
  tags?: string[];
  gender?: string;
  sizes?: string[];
  publish?: string;
  coverUrl?: string;
  images?: any[]; // Cambiar a string[] para URLs
  colors?: string[];
  quantity?: number;
  category?: string;
  available?: number;
  totalSold?: number;
  description?: string;
  totalRatings?: number;
  totalReviews?: number;
  inventoryType?: string;
  subDescription?: string;
  priceSale?: number | null;
  ratings?: {
    name: string;
    starCount: number;
    reviewCount: number;
  }[];
  saleLabel?: {
    enabled: boolean;
    content: string;
  };
  newLabel?: {
    enabled: boolean;
    content: string;
  };
  reviews?: Types.ObjectId[];
  productId?: number;
  // Campo temporal para archivos nuevos
  imageFiles?: Express.Multer.File[];
  _id?: Types.ObjectId;

  constructor(data: Partial<UpdateProductDto> = {}) {
    Object.assign(this, data);
    this.imageFiles = (data as any).imageFiles || [];
  }
}

export class CreateReviewDto implements IProductReviewNewForm {
  rating: number | null;
  review: string;
  name: string;
  email: string;

  constructor(data: Partial<CreateReviewDto> = {}) {
    this.rating = data.rating || null;
    this.review = data.review || '';
    this.name = data.name || '';
    this.email = data.email || '';
  }
}
