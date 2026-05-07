// src/services/TwoFactorService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Generar secreto para autenticación de dos factores
 */



export function generateQRCodeSecret(): string {
  return speakeasy.generateSecret({
    name: process.env.APP_NAME,
    length: 20,
  }).base32;
}

/**
 * Generar URL del código QR
 */
export async function generateQRCodeDataURL(
  secret: string,
  email: string
): Promise<string> {
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret,
    label: email,
    issuer: process.env.APP_NAME,
    encoding: 'base32',
  });

  return await QRCode.toDataURL(otpauthUrl);
}

/**
 * Verificar código TOTP
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1,
  });
}