import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface para los permisos
interface IUserPermissions {
  showPhoneInfo: boolean;
  showEmailInfo: boolean;
  showPersonalInfo: boolean;
}

// Interface principal del documento User
export interface IUser extends Document {
  _id: Types.ObjectId;
  idParental?: Types.ObjectId;
  memberId: string;
  name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  country: string;
  theme: string;
  photoProfile?: string;
  photo_id_profile?: string;
  address: string;
  userStatus: number;
  role: number;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  token?: string;
  isActivated: boolean;
  stateActivation?: string;
  randomCode?: string;
  hostName?: string;
  pets: Types.ObjectId[];
  permissions: {
    showPhoneInfo: boolean;
    showEmailInfo: boolean;
    showPersonalInfo: boolean;
  };
  createdAt: Date;
  updatedAt: Date;

  // Métodos de instancia
  comparePassword(
    candidatePassword: string,
    callback: (err: any, isMatch?: boolean) => void
  ): void;
}

const UserSchema = new Schema<IUser>(
  {
    memberId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    theme: {
      type: String,
      default: 'dark',
    },
    photoProfile: {
      type: String,
      required: false,
    },
    photo_id_profile: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
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
    permissions: {
      showPhoneInfo: { type: Boolean, default: true },
      showEmailInfo: { type: Boolean, default: true },
      showPersonalInfo: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Métodos de instancia
UserSchema.methods.comparePassword = function (
  candidatePassword: string,
  callback: (err: any, isMatch?: boolean) => void
): void {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

// Static methods
UserSchema.statics.getUserById = async function (
  id: string,
  callback: (err: any, user?: IUser) => void
) {
  try {
    const user = await this.findById(id);
    callback(null, user);
  } catch (err) {
    callback(err);
  }
};

UserSchema.statics.getUserByUsername = async function (
  username: string,
  callback: (err: any, user?: IUser) => void
) {
  try {
    const user = await this.findOne({ username });
    callback(null, user);
  } catch (err) {
    callback(err);
  }
};

UserSchema.statics.getUserByEmail = async function (
  email: string,
  callback: (err: any, user?: IUser) => void
) {
  try {
    const user = await this.findOne({ email });
    callback(null, user);
  } catch (err) {
    callback(err);
  }
};

export default model<IUser>('User', UserSchema);
