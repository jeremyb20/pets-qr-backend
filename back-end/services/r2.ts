// back-end/services/r2.ts
// ============================================
// ALMACENAMIENTO DE IMÁGENES EN CLOUDFLARE R2
// Reemplaza a Cloudinary manteniendo la misma interfaz
// (uploadImage, uploadImageFromBuffer, deleteImage) para que
// los controladores no necesiten cambios de lógica.
// ============================================
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import 'dotenv/config';

// ============================================
// CONFIGURACIÓN (S3-compatible de Cloudflare R2)
// ============================================
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID as string,
    secretAccessKey: R2_SECRET_ACCESS_KEY as string,
  },
});

// ============================================
// TIPOS (compatibles con el servicio anterior)
// ============================================
export interface UploadOptions {
  folder?: string;
  tags?: string[];
  public_id?: string;
  /** No aplica en R2 (sin transformaciones). Se mantiene por compatibilidad. */
  quality?: string | number;
  width?: number;
  height?: number;
  crop?: string;
}

export interface UploadResult {
  imageId: string; // key del objeto en R2 (para eliminar)
  imageUrl: string; // URL pública (para mostrar)
}

// ============================================
// HELPERS
// ============================================
const buildKey = (options: UploadOptions, ext: string): string => {
  const folder = (options.folder || 'uploads')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const name = options.public_id
    ? `${options.public_id}.${ext}`
    : `${randomUUID()}.${ext}`;
  return folder ? `${folder}/${name}` : name;
};

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

/** Detecta el tipo de imagen por firma de bytes (magic numbers). */
const detectImageType = (
  buffer: Buffer
): { ext: string; contentType: string } => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  if (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { ext: 'gif', contentType: 'image/gif' };
  }
  // AVIF: ...ftypavif
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') {
      return { ext: 'avif', contentType: 'image/avif' };
    }
  }
  // Fallback
  return { ext: 'jpg', contentType: 'image/jpeg' };
};

const putObject = async (
  buffer: Buffer,
  options: UploadOptions,
  ext: string,
  contentType: string
): Promise<UploadResult> => {
  if (!R2_BUCKET) {
    throw new Error('Falta configurar R2_BUCKET');
  }
  if (!R2_PUBLIC_URL) {
    throw new Error('Falta configurar R2_PUBLIC_URL');
  }

  const key = buildKey(options, ext);

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: options.tags?.length
        ? { tags: options.tags.join(',') }
        : undefined,
    })
  );

  return {
    imageId: key,
    imageUrl: `${R2_PUBLIC_URL}/${key}`,
  };
};

// ============================================
// 1️⃣ SUBIR IMAGEN DESDE BASE64 (compatibilidad)
// ============================================
export const uploadImage = async (
  imageBase64: string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    if (!imageBase64 || imageBase64.trim() === '') {
      throw new Error('La imagen está vacía');
    }

    // Limpiar base64 y capturar mime si viene como data URL
    let base64Data = imageBase64;
    let mime: string | undefined;

    const dataMatch = /^data:(image\/[\w.+-]+);base64,(.*)$/s.exec(imageBase64);
    if (dataMatch) {
      mime = dataMatch[1];
      base64Data = dataMatch[2];
    } else if (imageBase64.includes('base64,')) {
      base64Data = imageBase64.split('base64,')[1];
    } else if (imageBase64.startsWith('data:image')) {
      base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    }

    base64Data = base64Data.replace(/\s/g, '');

    if (!base64Data) {
      throw new Error('Formato de imagen inválido');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      throw new Error('Formato de imagen inválido');
    }

    const detected = detectImageType(buffer);
    const ext = mime ? (EXT_BY_MIME[mime] ?? detected.ext) : detected.ext;
    const contentType = mime ?? detected.contentType;

    return await putObject(buffer, options, ext, contentType);
  } catch (error) {
    console.error('Error uploading base64 to R2:', error);
    throw new Error(
      `Error al subir la imagen: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// ============================================
// 2️⃣ SUBIR IMAGEN DESDE BUFFER (multer memoryStorage)
// ============================================
export const uploadImageFromBuffer = async (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error('El buffer de la imagen está vacío');
    }

    const { ext, contentType } = detectImageType(buffer);
    return await putObject(buffer, options, ext, contentType);
  } catch (error) {
    console.error('Error in uploadImageFromBuffer (R2):', error);
    throw new Error(
      `Error al subir la imagen: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// ============================================
// 3️⃣ ELIMINAR IMAGEN POR key
// ============================================
export const deleteImage = async (imageId: string): Promise<boolean> => {
  try {
    if (!imageId) return false;

    // Ignorar registros antiguos de Cloudinary (URLs completas) —
    // no existen como keys en R2. R2 DeleteObject es idempotente.
    const key = imageId.replace(/^https?:\/\/[^/]+\//, '');

    await s3.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error(`Error deleting image ${imageId} from R2:`, error);
    return false;
  }
};
