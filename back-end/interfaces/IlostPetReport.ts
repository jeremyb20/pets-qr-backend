// interfaces/IlostPetReport.ts

import { Types } from 'mongoose';

export interface ILostPetReport {
  _id: Types.ObjectId;

  // Información de la mascota (si está registrada)
  registeredPet?: {
    petId: Types.ObjectId; // Referencia al Pet existente
    isLinked: boolean;
    linkedAt: Date;
    linkedBy: Types.ObjectId; // Usuario que hizo el link
  };

  // Datos de la mascota (para casos no registrados o copia de seguridad)
  petInfo: {
    name: string;
    type: 'dog' | 'cat' | 'other';
    breed?: string;
    color?: string;
    size?: 'small' | 'medium' | 'large';
    gender?: 'male' | 'female';
    age?: string;
    distinctiveFeatures?: string;
    collarInfo?: string;
    microchip?: {
      number: string;
      company: string;
    };
    photo?: string;
    photo_id?: string;
  };

  // Información del reportante (puede ser anónimo o usuario registrado)
  reporter: {
    userId?: Types.ObjectId; // Si está registrado
    name: string;
    email?: string;
    phone?: string;
    isAnonymous: boolean;
    ipAddress?: string;
  };

  // Información de contacto del dueño (si es diferente al reportante)
  ownerContact?: {
    name: string;
    email: string;
    phone: string;
    alternativePhone?: string;
  };

  // Detalles de la pérdida
  lostDetails: {
    date: string;
    time?: string;
    lastSeenLocation: {
      address: string;
      lat: string;
      lng: string;
      placeId?: string;
    };
    circumstances?: string;
    wasWearingCollar?: boolean;
    hasMicrochip?: boolean;
    isNeutered?: boolean;
  };

  // Recompensa
  reward?: {
    isOffered: boolean;
    amount?: number;
    description?: string;
  };

  // Estado del reporte
  status: {
    value: 'active' | 'pending' | 'resolved' | 'expired' | 'cancelled';
    updatedAt: Date;
    reason?: string;
  };

  // Avistamientos (sightings) de esta mascota perdida
  sightings: Array<{
    _id: Types.ObjectId;
    reporter: {
      name: string;
      email?: string;
      phone?: string;
      isAnonymous: boolean;
    };
    location: {
      address: string;
      lat: string;
      lng: string;
      placeId?: string;
    };
    sightingDate: string;
    description: string;
    photo?: string;
    petCondition: {
      status: 'healthy' | 'injured' | 'sick' | 'deceased';
      description?: string;
    };
    contactMade: boolean;
    verified: boolean;
    verifiedBy?: Types.ObjectId;
    createdAt: Date;
  }>;

  // Métricas y estadísticas
  stats: {
    viewsCount: number;
    sightingsCount: number;
    unreadSightings: number;
    sharesCount: number;
    lastActivityAt: Date;
  };

  // URLs públicas para compartir
  publicLinks: {
    shareableLink: string;
    qrCode?: string;
    expiresAt?: Date;
  };

  // Temporalidad
  expiresAt: Date; // El reporte expira después de X tiempo
  createdAt: Date;
  updatedAt: Date;

  // Metadatos
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source: 'web' | 'mobile' | 'whatsapp' | 'facebook' | 'other';
    language?: string;
  };
}
