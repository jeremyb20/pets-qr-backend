export interface ApiResponse<T> {
  success: boolean;
  payload: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: any;
}

// types/user.types.ts
export interface UserQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserFilters {
  isActivated?: boolean;
  email?: { $regex: string; $options: string };
  userStatus?: number;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface PetQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  petStatus?: string;
  startDate?: string;
  endDate?: string;
  id?: string;
}

export interface PetFilters {
  idParental?: string;
  petName?: { $regex: string; $options: string };
  petStatus?: number;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}
