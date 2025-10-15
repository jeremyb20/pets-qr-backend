import { Document, Types } from 'mongoose';

// ----------------------------------------------------------------------

export type IProductFilterValue = string | string[] | number | number[];

export type IProductFilters = {
  rating: string;
  gender: string[];
  category: string;
  colors: string[];
  priceRange: number[];
};

// ----------------------------------------------------------------------

export type IProductReviewNewForm = {
  rating: number | null;
  review: string;
  name: string;
  email: string;
};

export interface IProductImage {
  imageURL: string;
  image_id: string;
}

// Interface base SIN Document de Mongoose
export interface IProductReviewBase {
  name: string;
  rating: number;
  comment: string;
  helpful: number;
  avatarUrl: string;
  isPurchased: boolean;
  attachments?: string[];
  email: string;
  postedAt: Date;
}

// Interface para el modelo (con Document)
export interface IProductReview extends IProductReviewBase, Document {
  id: string;
}

export interface IRating {
  name: string;
  starCount: number;
  reviewCount: number;
}

export interface ILabel {
  enabled: boolean;
  content: string;
}

// Interface base SIN Document de Mongoose
export interface IProductBase {
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
  images: any[];
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
  reviews: Types.ObjectId[];
  createdAt: Date;
  ratings: IRating[];
  saleLabel: ILabel;
  newLabel: ILabel;
}

// Interface para el modelo (con Document)
export interface IProduct extends IProductBase, Document {
  id: string;
}

export type IProductTableFilterValue = string | string[];

export type IProductTableFilters = {
  stock: string[];
  publish: string[];
};

// Para crear nuevos productos (usamos IProductBase sin los campos automáticos)
export type IProductCreate = Omit<IProductBase, 'createdAt' | 'reviews'> & {
  reviews?: Types.ObjectId[];
  createdAt?: Date;
};

// Para actualizar productos
export type IProductUpdate = Partial<IProductCreate>;

// Respuestas de la API
export interface ProductResponse {
  success: boolean;
  data?: IProduct;
  message?: string;
}

export interface ProductsResponse {
  success: boolean;
  data?: IProduct[];
  total?: number;
  message?: string;
}
