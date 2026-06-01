import { Document, Types } from 'mongoose';

export interface IQrCode extends Document {
  _id: Types.ObjectId;
  randomCode: string;
  status: 'available' | 'assigned' | 'activated' | 'pending';
  assignedTo?: Types.ObjectId;
  assignedPet?: Types.ObjectId;
  activatedBy?: Types.ObjectId;
  activationDate?: Date;
  purchaseInfo: {
    soldDate?: Date;
    price: number;
    seller?: string;
  };
  hostName?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export interface ICreateQrCode {
  randomCode: string;
  price?: number;
}

export interface IRegisterUserWithQR {
  randomCode: string;
  userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
  };
  petData: {
    petName: string;
    genderSelected?: string;
    breed?: string;
    weight?: string;
    birthDate?: string;
  };
}

export interface IAddPetWithQR {
  randomCode: string;
  petData: {
    petName: string;
    genderSelected?: string;
    breed?: string;
    weight?: string;
    birthDate?: string;
  };
}

export interface IScanQRCode {
  randomCode: string;
  lat?: string;
  lng?: string;
}

export interface IQrCodeTableFilters {
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
  status?: string[];
  assignedTo?: string[];
  activatedBy?: string[];
  hostName?: string[];
  // Puedes agregar más filtros según necesites
}
