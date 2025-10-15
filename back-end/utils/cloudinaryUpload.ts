import cloudinary from '../config/cloudinary.config';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface ICloudinaryUploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

export const uploadToCloudinary = async (
  file: Express.Multer.File | { path: string; buffer?: Buffer }
): Promise<ICloudinaryUploadResult> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'products',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto' },
          ],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined
        ) => {
          if (error) {
            reject(new Error(`Cloudinary upload error: ${error.message}`));
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
            reject(new Error('Unknown error uploading to Cloudinary'));
          }
        }
      );

      // Si es un archivo Multer
      if ('buffer' in file && file.buffer) {
        uploadStream.end(file.buffer);
      } else {
        // Si es una ruta de archivo
        uploadStream.end();
      }
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
};

export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[] | Array<{ path: string; buffer?: Buffer }>
): Promise<{ urls: string[]; errors: string[] }> => {
  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const result = await uploadToCloudinary(file);
      if (result.success && result.url) {
        urls.push(result.url);
      } else if (result.error) {
        errors.push(result.error);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Upload failed');
    }
  }

  return { urls, errors };
};
