import { Request, Response, NextFunction } from 'express';

export interface AdminProductController {
  getAllProductList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  getProducts(req: Request, res: Response, next: NextFunction): Promise<void>;
  getProductById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  createProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
  updateProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
  deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void>;
  bulkDeleteProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  getProductReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  createProductReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  updateProductReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  deleteProductReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  getProductStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}
