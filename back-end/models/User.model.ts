import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  IUser,
  IUserConfiguration,
  IUserPermissions,
  IUserProfile,
  IUserThemeConfig,
} from '../interfaces/IUser';

// Subesquema para el perfil
const UserProfileSchema = new Schema<IUserProfile>({
  phone: {
    type: String,
    default: '',
  },
  country: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  username: {
    type: String,
  },
  photoProfile: {
    type: String,
    default: '',
  },
  photo_id_profile: {
    type: String,
    default: '',
  },
  city: {
    type: String,
    default: '',
  },
  state: {
    type: String,
    default: '',
  },
  zipCode: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  avatarProfile: {
    type: String,
    default: '2',
  },
});

// Subesquema para la configuración del tema
const UserThemeConfigSchema = new Schema<IUserThemeConfig>({
  fontSizeScale: {
    type: Number,
    default: 0.85,
  },
  themeColorPresets: {
    type: String,
    default: 'default',
  },
  themeContrast: {
    type: String,
    default: 'default',
  },
  themeDirection: {
    type: String,
    default: 'ltr',
  },
  themeLayout: {
    type: String,
    default: 'vertical',
  },
  themeMode: {
    type: String,
    default: 'dark',
  },
  themeStretch: {
    type: Boolean,
    default: false,
  },
});

// Subesquema para los permisos
const UserPermissionsSchema = new Schema<IUserPermissions>({
  showPhoneInfo: {
    type: Boolean,
    default: true,
  },
  showEmailInfo: {
    type: Boolean,
    default: true,
  },
  showPersonalInfo: {
    type: Boolean,
    default: true,
  },
});

// Esquema para la configuración completa
const UserConfigurationSchema = new Schema<IUserConfiguration>({
  theme: {
    type: UserThemeConfigSchema,
    default: () => ({}),
  },
  permissions: {
    type: UserPermissionsSchema,
    default: () => ({}),
  },
});

const UserSchema = new Schema<IUser>(
  {
    memberId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    passwordChangedAt: Date,
    token: String,
    randomCode: String,
    isActivated: {
      type: Boolean,
      default: false,
    },
    stateActivation: String,
    hostName: String,
    userStatus: {
      type: Number,
      default: 1,
    },
    role: {
      type: Number,
      default: 1,
    },
    pets: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Pet',
      },
    ],
    // Campo de configuración (ahora incluye theme y permissions)
    configuration: {
      type: UserConfigurationSchema,
      default: () => ({}),
    },
    // Campo de perfil
    profile: {
      type: UserProfileSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Método para comparar contraseñas
UserSchema.methods.comparePassword = function (
  candidatePassword: string,
  callback: (err: any, isMatch?: boolean) => void
): void {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

export default model<IUser>('User', UserSchema);
