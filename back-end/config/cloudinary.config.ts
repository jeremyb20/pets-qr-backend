// import { v2 as cloudinary, ConfigOptions } from 'cloudinary';

// // Configurar Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY_CLOUDINARY,
//   api_secret: process.env.API_SECRET,
// } as ConfigOptions);

// export default cloudinary;

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
