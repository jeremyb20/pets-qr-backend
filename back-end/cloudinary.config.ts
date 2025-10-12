import { v2 as cloudinary, ConfigOptions } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET,
} as ConfigOptions);

export default cloudinary;
