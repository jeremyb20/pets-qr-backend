import bcrypt from 'bcryptjs';
import User from '../models/User.model';
import { IUser } from '../interfaces/IUser';
import { UserRole } from '../middlewares/authMiddleware';

interface CreateManagedUserInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  role: UserRole;
}

interface CreateManagedUserResult {
  user: IUser;
  created: boolean;
}

const generateMemberId = async (): Promise<string> => {
  let memberId = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    memberId = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await User.findOne({ memberId });
    if (!existingUser) isUnique = true;
    attempts++;
  }

  if (!isUnique) throw new Error('Could not generate a unique memberId');
  return memberId;
};

const generateUsername = async (baseUsername: string): Promise<string> => {
  const username = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
  let finalUsername = username || 'user';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    const existingUser = await User.findOne({
      'profile.username': finalUsername,
    });

    if (!existingUser) {
      isUnique = true;
    } else {
      finalUsername = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
      attempts++;
    }
  }

  if (!isUnique) throw new Error('Could not generate a unique username');
  return finalUsername;
};

export const createManagedUser = async ({
  email,
  password,
  name,
  phone,
  role,
}: CreateManagedUserInput): Promise<CreateManagedUserResult> => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return { user: existingUser, created: false };
  }

  const memberId = await generateMemberId();
  const username = await generateUsername(normalizedEmail.split('@')[0]);
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    memberId,
    email: normalizedEmail,
    password: hashedPassword,
    userStatus: 1,
    role,
    isActivated: true,
    pets: [],
    configuration: {
      theme: {
        fontSizeScale: 0.85,
        themeColorPresets: 'default',
        themeContrast: 'default',
        themeDirection: 'ltr',
        themeLayout: 'vertical',
        themeMode: 'dark',
        themeStretch: false,
      },
      permissions: {
        showPhoneInfo: true,
        showEmailInfo: true,
        showPersonalInfo: true,
      },
    },
    profile: {
      name: name?.trim() || normalizedEmail.split('@')[0],
      username,
      phone: phone?.trim() || '',
      country: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      isPublic: false,
      avatarProfile: '2',
    },
  });

  return { user, created: true };
};
