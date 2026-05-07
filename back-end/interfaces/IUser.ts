import { Types } from 'mongoose';


export interface IUserSecurity {
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'app' | 'email' | null;
  twoFactorSecret?: string;
  twoFactorVerified?: boolean;
  twoFactorTempCode?: string;
  twoFactorTempCodeExpires?: Date;
  backupEmail?: string;
  sessionVersion?: number;
  currentSessionToken?: string;
}
export interface IUserDevices {
  id: string;
  name: string;
  location?: string;
  lastActive: Date;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  userAgent?: string;
  ipAddress?: string | string[];
}

export interface IUserSecurityConfig {
  security: IUserSecurity;
  devices: IUserDevices[]; // ← Permissions movido aquí
}

// Interface para el perfil del usuario
export interface IUserProfile {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  country: string;
  name: string;
  username: string;
  photoProfile?: string;
  photo_id_profile?: string;
  isPublic?: boolean;
  avatarProfile?: string;
}

// Interface para la configuración del tema
export interface IUserThemeConfig {
  fontSizeScale: number;
  themeColorPresets: string;
  themeContrast: string;
  themeDirection: string;
  themeLayout: string;
  themeMode: string;
  themeStretch: boolean;
}

// Interface para los permisos
export interface IUserPermissions {
  showPhoneInfo: boolean;
  showEmailInfo: boolean;
  showPersonalInfo: boolean;
}

// Interface para la configuración completa
export interface IUserConfiguration {
  theme: IUserThemeConfig;
  permissions: IUserPermissions; // ← Permissions movido aquí
}

// Interface principal del documento User
export interface IUser extends Document {
  _id: Types.ObjectId;
  idParental?: Types.ObjectId;
  memberId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  userStatus: number;
  role: number;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordChangedAt?: Date;
  token?: string;
  isActivated: boolean;
  stateActivation?: string;
  randomCode?: string;
  hostName?: string;
  pets: Types.ObjectId[];
  configuration: IUserConfiguration; // ← Permissions ahora está aquí
  profile: IUserProfile;
  createdAt: Date;
  updatedAt: Date;
  id: string;
  security: IUserSecurityConfig;
  // Métodos de instancia
  comparePassword(
    candidatePassword: string,
    callback: (err: any, isMatch?: boolean) => void
  ): void;
}

export interface RegistrationRequest {
  code: string;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    country: string;
  };
  petData: {
    petName: string;
    breed: string;
    genderSelected: string;
    birthDate?: string;
    weight?: string;
    favoriteActivities?: string;
    healthAndRequirements?: string;
  };
}
