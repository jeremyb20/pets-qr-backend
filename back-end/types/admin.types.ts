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

export interface AdminController {
  getAllUsersLegacy(req: Request, res: Response): Promise<void>;
  getAllRegisteredUsers(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  getNewCodes(req: Request, res: Response): Promise<void>;
  deleteUserById(req: Request, res: Response): Promise<void>;
  editUser(req: Request, res: Response, next?: NextFunction): Promise<void>;
  editUserSecondLevel(req: Request, res: Response): Promise<void>;
  deletePetByIdForAdmin(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  createNewCode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updateStateActivationCode(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  getLocationAllPets(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updateFirstProfile(
    req: Request,
    res: Response,
    next?: NextFunction
  ): Promise<void>;
  updateLocationPet(req: Request, res: Response): Promise<void>;
  sortNewPetProfile(req: Request, res: Response): Promise<void>;
}

export interface PetProfile {
  _id: any;
  petName?: string;
  idParental?: string;
  email?: string;
  phone?: string;
  photo?: string;
  age?: string;
  birthDate?: string;
  ownerPetName?: string;
  petStatus?: string;
  petViewCounter?: any[];
  photo_id?: string;
  isDigitalIdentificationActive?: boolean;
}
