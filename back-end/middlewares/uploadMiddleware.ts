import multer from 'multer';
import { Request } from 'express';

// Configuración para productos (memory storage para Cloudinary)
const memoryStorage = multer.memoryStorage();

export const uploadProductImages = multer({
  storage: memoryStorage,
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
}).array('images', 10); // ← array() en lugar de fields()
