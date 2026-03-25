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

export interface SuccessResponse {
  success: true;
  message: string;
  data?: any;
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
  memberId?: { $regex: string; $options: string };
  userStatus?: number;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
  $or?: Array<{
    email?: { $regex: string; $options: string };
    memberId?: { $regex: string; $options: string };
  }>;
}

export interface ApiQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface PetQueryParams extends ApiQueryParams {
  petStatus?: string;
  id?: string;
}

export interface MedicalRecordQueryParams extends PetQueryParams {
  type?: 'vaccine' | 'deworming' | 'medical_visit';
  petId?: string;
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

export interface IUpcomingAppointment {
  id: string;
  petId: string;
  petName: string;
  petPhoto?: string;
  type: 'vaccine' | 'deworming' | 'medical_visit';
  title: string;
  description: string;
  date: string;
  time?: string;
  location?: string;
  veterinarian?: string;
  veterinarianPhone?: string;
  status: 'upcoming' | 'overdue' | 'today';
  daysUntil: number;
  originalRecord: any;
}

export interface UpcomingAppointmentsQueryParams {
  days?: string; // Días hacia adelante a considerar (default: 30)
  includePast?: string; // Incluir citas vencidas (default: false)
  limit?: string; // Límite de resultados (default: 10)
  petId?: string; // Filtrar por mascota específica
}
