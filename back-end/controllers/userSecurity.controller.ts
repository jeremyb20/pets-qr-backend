// src/controllers/UserSecurityController.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User.model';
import EmailService from '../services/emailService';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IUser } from '../interfaces/IUser';
import dotenv from 'dotenv';
dotenv.config();

export class UserSecurityController {
  private emailService: EmailService;
  private readonly TWO_FACTOR_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutos

  constructor() {
    try {
      this.emailService = EmailService.getInstance();
      console.log('✅ EmailService inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando EmailService:', error);
      // Crear un mock de EmailService para evitar errores
      this.emailService = {
        sendEmail: async () => {
          console.warn('⚠️ EmailService no disponible, email no enviado');
          return false;
        },
      } as unknown as EmailService;
    }
  }

  /**
   * Obtener configuración de seguridad del usuario
   */
  async getSecurityConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();

      const user = await User.findById(userId).select('security profile email');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Acceder a la estructura anidada: security.security
      const securityData = user.security?.security || {};
      const devices = user.security?.devices || [];

      const devicesFormatted = devices.map((device: any) => ({
        id: device.id,
        name: device.name,
        location: device.location,
        lastActive: device.lastActive,
        deviceType: device.deviceType,
      }));

      res.json({
        success: true,
        payload: {
          twoFactor: {
            isEmailVerified: securityData.isEmailVerified || false,
            enabled: securityData.twoFactorEnabled || false,
            method: securityData.twoFactorMethod || null,
            email: securityData.backupEmail || user.email,
            phone: user.profile?.phone || '',
          },
          devices: devicesFormatted,
        },
      });
    } catch (error) {
      console.error('Error in getSecurityConfig:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Actualizar configuración de seguridad
   */
  async updateSecurityConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { backupEmail } = req.body;

      const updateData: any = {};

      if (backupEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(backupEmail)) {
          res.status(400).json({
            success: false,
            message: 'Invalid email',
          });
          return;
        }
        updateData['security.security.backupEmail'] = backupEmail;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Updated security settings',
      });
    } catch (error) {
      console.error('Error in updateSecurityConfig:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Habilitar 2FA
   */
  async enable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { method, verificationCode } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Inicializar estructura security si no existe
      if (!user.security) {
        user.security = { security: {}, devices: [] };
      }
      if (!user.security.security) {
        user.security.security = {};
      }

      // Método: Aplicación Autenticadora
      if (method === 'app') {
        // Paso 1: Generar QR (sin código de verificación)
        if (!verificationCode) {
          const twoFactorSecret = speakeasy.generateSecret({
            name: process.env.APP_NAME || 'PlaquitasCR',
            length: 20,
          });

          const otpauthUrl = speakeasy.otpauthURL({
            secret: twoFactorSecret.base32,
            label: user.email,
            issuer: process.env.APP_NAME || 'PlaquitasCR',
            encoding: 'base32',
          });

          const qrCode = await QRCode.toDataURL(otpauthUrl);

          // Guardar el secret temporalmente
          user.security.security.twoFactorSecret = twoFactorSecret.base32;
          await user.save();

          res.json({
            success: true,
            payload: {
              secret: twoFactorSecret.base32,
              qrCode,
              message:
                'Escanea el código QR con tu aplicación de autenticación',
            },
          });
          return;
        }

        // Paso 2: Verificar código y habilitar
        if (verificationCode && user.security.security.twoFactorSecret) {
          const isValid = speakeasy.totp.verify({
            secret: user.security.security.twoFactorSecret,
            encoding: 'base32',
            token: verificationCode,
            window: 1,
          });

          if (!isValid) {
            res.status(400).json({
              success: false,
              message: 'Código de verificación inválido',
            });
            return;
          }

          user.security.security.twoFactorEnabled = true;
          user.security.security.twoFactorMethod = method;
          user.security.security.twoFactorVerified = true;

          await user.save();

          // Enviar email de confirmación
          const emailService = EmailService.getInstance();
          const lang = req.headers['accept-language']?.split(',')[0] || 'es';
          await emailService.sendEmail({
            to: user.email,
            subject: 'Two-Factor Authentication Enabled',
            template: 'email-2fa-enabled',
            lang: lang,
            context: {
              userName: user.profile?.name || user.email,
              method: 'Authenticator App',
              year: new Date().getFullYear(),
              companyName: process.env.APP_NAME || 'PlaquitasCR',
              logoUrl: process.env.LOGO_URL,
              phoneNumber: process.env.PHONE_NUMBER,
              facebookUrl: process.env.FACEBOOK_URL,
              facebookUsername: process.env.FACEBOOK_USERNAME,
              instagramUrl: process.env.INSTAGRAM_URL,
              instagramUsername: process.env.INSTAGRAM_USERNAME,
              supportEmail: process.env.SUPPORT_EMAIL,
            },
          });

          res.json({
            success: true,
            message: `Two-factor authentication enabled via ${method}`,
            payload: {
              enabled: true,
              method,
            },
          });
          return;
        }
      }

      // Método: Email
      else if (method === 'email') {
        // Enviar código de verificación
        if (!verificationCode) {
          const newVerificationCode = crypto
            .randomInt(100000, 999999)
            .toString();

          user.security.security.twoFactorTempCode = newVerificationCode;
          user.security.security.twoFactorTempCodeExpires = new Date(
            Date.now() + 10 * 60 * 1000
          );
          await user.save();

          const emailService = EmailService.getInstance();
          const lang = req.headers['accept-language']?.split(',')[0] || 'es';
          await emailService.sendEmail({
            to: user.email,
            subject: 'Código de verificación 2FA',
            template: 'email-2fa-verification',
            lang: lang,
            context: {
              userName: user.profile?.name || user.email,
              verificationCode: newVerificationCode,
              expiryMinutes: 10,
              year: new Date().getFullYear(),
              companyName: process.env.APP_NAME || 'PlaquitasCR',
              logoUrl: process.env.LOGO_URL,
              phoneNumber: process.env.PHONE_NUMBER,
              facebookUrl: process.env.FACEBOOK_URL,
              facebookUsername: process.env.FACEBOOK_USERNAME,
              instagramUrl: process.env.INSTAGRAM_URL,
              instagramUsername: process.env.INSTAGRAM_USERNAME,
              supportEmail: process.env.SUPPORT_EMAIL,
            },
          });

          res.json({
            success: true,
            payload: {
              requiresVerification: true,
              message: 'Se ha enviado un código de verificación a tu email',
            },
          });
          return;
        }

        // Verificar código y habilitar
        const now = new Date();
        const isValid =
          user.security.security.twoFactorTempCode === verificationCode &&
          user.security.security.twoFactorTempCodeExpires &&
          user.security.security.twoFactorTempCodeExpires > now;

        if (!isValid) {
          res.status(400).json({
            success: false,
            message: 'Código de verificación inválido o expirado',
          });
          return;
        }

        user.security.security.twoFactorEnabled = true;
        user.security.security.twoFactorMethod = method;
        user.security.security.twoFactorVerified = true;
        user.security.security.twoFactorTempCode = undefined;
        user.security.security.twoFactorTempCodeExpires = undefined;

        await user.save();

        const emailService = EmailService.getInstance();
        const lang = req.headers['accept-language']?.split(',')[0] || 'es';
        await emailService.sendEmail({
          to: user.email,
          subject: 'Two-Factor Authentication Enabled',
          template: 'email-2fa-enabled',
          lang: lang,
          context: {
            userName: user.profile?.name || user.email,
            method: 'Email',
            year: new Date().getFullYear(),
            companyName: process.env.APP_NAME || 'PlaquitasCR',
            logoUrl: process.env.LOGO_URL,
            phoneNumber: process.env.PHONE_NUMBER,
            facebookUrl: process.env.FACEBOOK_URL,
            facebookUsername: process.env.FACEBOOK_USERNAME,
            instagramUrl: process.env.INSTAGRAM_URL,
            instagramUsername: process.env.INSTAGRAM_USERNAME,
            supportEmail: process.env.SUPPORT_EMAIL,
          },
        });

        res.json({
          success: true,
          message: `Two-factor authentication enabled via ${method}`,
          payload: {
            enabled: true,
            method,
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Invalid request',
      });
    } catch (error) {
      console.error('Error in enable2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Verificar código 2FA enviado por email
   */
  async verify2FACode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { code, method } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      let isValid = false;

      if (method === 'app' && user.security?.security?.twoFactorSecret) {
        isValid = speakeasy.totp.verify({
          secret: user.security.security.twoFactorSecret,
          encoding: 'base32',
          token: code,
          window: 1,
        });
      } else if (method === 'email') {
        const now = new Date();
        isValid = !!(
          user.security?.security?.twoFactorTempCode === code &&
          user.security?.security?.twoFactorTempCodeExpires &&
          user.security.security.twoFactorTempCodeExpires > now
        );
      }

      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Code verified successfully',
        payload: {
          verified: true,
        },
      });
    } catch (error) {
      console.error('Error in verify2FACode:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Deshabilitar 2FA
   */
  /**
   * Deshabilitar 2FA (requiere código de verificación)
   */
  async disable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { verificationCode, method } = req.body;

      // Validar que se proporcione el código
      if (!verificationCode) {
        res.status(400).json({
          success: false,
          message: 'Verification code is required to disable 2FA',
        });
        return;
      }

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Verificar que 2FA esté habilitado
      if (!user.security?.security?.twoFactorEnabled) {
        res.status(400).json({
          success: false,
          message: 'Two-factor authentication is not enabled',
        });
        return;
      }

      let isValid = false;
      const twoFactorMethod = user.security.security.twoFactorMethod;

      // Verificar según el método de 2FA
      if (twoFactorMethod === 'app' && user.security.security.twoFactorSecret) {
        // Verificar código TOTP
        isValid = speakeasy.totp.verify({
          secret: user.security.security.twoFactorSecret,
          encoding: 'base32',
          token: verificationCode,
          window: 1,
        });
      } else if (twoFactorMethod === 'email') {
        // Verificar código enviado por email
        const now = new Date();
        isValid = !!(
          user.security.security.twoFactorTempCode === verificationCode &&
          user.security.security.twoFactorTempCodeExpires &&
          user.security.security.twoFactorTempCodeExpires > now
        );
      }

      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code',
        });
        return;
      }

      // Si el código es válido, deshabilitar 2FA
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'security.security.twoFactorEnabled': false,
            'security.security.twoFactorMethod': null,
            'security.security.twoFactorVerified': false,
            'security.security.twoFactorSecret': null,
            'security.security.twoFactorTempCode': null,
            'security.security.twoFactorTempCodeExpires': null,
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Enviar notificación por email
      const emailService = EmailService.getInstance();
      const lang = req.headers['accept-language']?.split(',')[0] || 'es';
      await emailService.sendEmail({
        to: updatedUser.email,
        subject: 'Two-Factor Authentication Disabled',
        template: 'email-2fa-disabled',
        lang: lang,
        context: {
          userName: updatedUser.profile?.name || updatedUser.email,
          year: new Date().getFullYear(),
          companyName: process.env.APP_NAME || 'PlaquitasCR',
          logoUrl: process.env.LOGO_URL,
          phoneNumber: process.env.PHONE_NUMBER,
          facebookUrl: process.env.FACEBOOK_URL,
          facebookUsername: process.env.FACEBOOK_USERNAME,
          instagramUrl: process.env.INSTAGRAM_URL,
          instagramUsername: process.env.INSTAGRAM_USERNAME,
          supportEmail: process.env.SUPPORT_EMAIL,
        },
      });

      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully',
      });
    } catch (error) {
      console.error('Error in disable2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Cerrar sesión de todos los dispositivos
   */
  async signOutAllDevices(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'security.devices': [],
            'security.security.currentSessionToken': null,
          },
          $inc: { 'security.security.sessionVersion': 1 },
        },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const emailService = EmailService.getInstance();
      const lang = req.headers['accept-language']?.split(',')[0] || 'es';
      await emailService.sendEmail({
        to: user.email,
        subject: 'Signed out from all devices',
        template: 'email-devices-signed-out',
        lang: lang,
        context: {
          userName: user.profile?.name || user.email,
          signOutDate: new Date().toLocaleString(),
          year: new Date().getFullYear(),
          companyName: process.env.APP_NAME || 'PlaquitasCR',
          logoUrl: process.env.LOGO_URL,
          phoneNumber: process.env.PHONE_NUMBER,
          facebookUrl: process.env.FACEBOOK_URL,
          facebookUsername: process.env.FACEBOOK_USERNAME,
          instagramUrl: process.env.INSTAGRAM_URL,
          instagramUsername: process.env.INSTAGRAM_USERNAME,
          supportEmail: process.env.SUPPORT_EMAIL,
        },
      });

      res.json({
        success: true,
        message: 'Sesión cerrada en todos los dispositivos',
      });
    } catch (error) {
      console.error('Error in signOutAllDevices:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Obtener dispositivos del usuario
   */
  async getDevices(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();

      const user = await User.findById(userId).select('security.devices');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const devices = (user.security?.devices || []).map((device: any) => ({
        id: device.id,
        name: device.name,
        location: device.location,
        lastActive: device.lastActive,
        deviceType: device.deviceType,
        userAgent: device.userAgent,
        ipAddress: device.ipAddress,
      }));

      res.json({
        success: true,
        payload: devices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Registrar un nuevo dispositivo
   */
  async registerDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { deviceName, deviceType, location } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Inicializar estructura security si no existe
      if (!user.security) {
        user.security = { security: {}, devices: [] };
      }
      if (!user.security.devices) {
        user.security.devices = [];
      }

      const newDevice = {
        id: crypto.randomBytes(16).toString('hex'),
        name: deviceName,
        location: location || 'Ubicación desconocida',
        lastActive: new Date(),
        deviceType: deviceType || 'desktop',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      };

      user.security.devices.push(newDevice);
      await user.save();

      res.json({
        success: true,
        message: 'Dispositivo registrado correctamente',
        payload: newDevice,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar un dispositivo específico
   */
  async removeDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { deviceId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $pull: { 'security.devices': { id: deviceId } },
        },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Dispositivo eliminado correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reenviar código de verificación 2FA
   */
  async resend2FACode(req: Request, res: Response): Promise<void> {
    try {
      // Obtener el token temporal del header
      const authHeader = req.headers.authorization;
      const tempToken = authHeader?.split(' ')[1];

      if (!tempToken) {
        res.status(401).json({
          success: false,
          message: 'No token provided',
        });
        return;
      }

      // Verificar el token temporal
      let decoded: any;
      try {
        decoded = jwt.verify(tempToken, process.env.SECRET as string);
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
        return;
      }

      const userId = decoded.id;
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Verificar que 2FA esté habilitado y sea por email
      const is2FAEnabled = user.security?.security?.twoFactorEnabled || false;
      const twoFactorMethod = user.security?.security?.twoFactorMethod;

      if (!is2FAEnabled || twoFactorMethod !== 'email') {
        res.status(400).json({
          success: false,
          message: '2FA via email is not enabled for this user',
        });
        return;
      }

      // Generar nuevo código
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      if (!user.security) {
        user.security = { security: {}, devices: [] };
      }
      if (!user.security.security) {
        user.security.security = {};
      }

      user.security.security.twoFactorTempCode = verificationCode;
      user.security.security.twoFactorTempCodeExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );
      await user.save();

      // Enviar email con el código
      const emailService = EmailService.getInstance();
      const lang = req.headers['accept-language']?.split(',')[0] || 'es';
      await emailService.sendEmail({
        to: user.email,
        subject: 'Nuevo código de verificación 2FA',
        template: 'email-2fa-verification',
        lang: lang,
        context: {
          userName: user.profile?.name || user.email,
          verificationCode,
          expiryMinutes: 10,
          year: new Date().getFullYear(),
          companyName: process.env.APP_NAME || 'PlaquitasCR',
          logoUrl: process.env.LOGO_URL,
          phoneNumber: process.env.PHONE_NUMBER,
          facebookUrl: process.env.FACEBOOK_URL,
          facebookUsername: process.env.FACEBOOK_USERNAME,
          instagramUrl: process.env.INSTAGRAM_URL,
          instagramUsername: process.env.INSTAGRAM_USERNAME,
          supportEmail: process.env.SUPPORT_EMAIL,
        },
      });

      console.log(`📧 Re-sent 2FA code to ${user.email}`);

      res.json({
        success: true,
        message: 'New verification code sent to your email',
      });
    } catch (error) {
      console.error('Error in resend2FACode:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
      });
    }
  }

  /**
   * Enviar código de verificación al email
   */
  async sendEmailVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { email } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Determinar el email a verificar
      const emailToVerify = email || user.email;

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailToVerify)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email',
        });
        return;
      }

      // Verificar si Your email address has already been verified
      if (
        user.security?.security?.isEmailVerified &&
        emailToVerify === user.email
      ) {
        res.status(400).json({
          success: false,
          message: 'Your email address has already been verified',
        });
        return;
      }

      // Verificar cooldown para reenvíos (60 segundos)
      const now = Date.now();
      const lastSent = user.security?.security?.lastEmailVerificationSent || 0;
      const timeSinceLastSent = (now - lastSent) / 1000;

      if (timeSinceLastSent < 60) {
        const remainingSeconds = Math.ceil(60 - timeSinceLastSent);
        res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} a few seconds before requesting another code`,
          code: 'RATE_LIMITED',
          remainingSeconds,
        });
        return;
      }

      // Verificar límite de intentos (máximo 5)
      const attempts = user.security?.security?.emailVerificationAttempts || 0;
      if (attempts >= 5) {
        const lastAttempt =
          user.security?.security?.lastVerificationAttempt || 0;
        const hoursSinceLastAttempt = (now - lastAttempt) / (1000 * 60 * 60);

        if (hoursSinceLastAttempt < 1) {
          res.status(429).json({
            success: false,
            message: 'Too many attempts. Please try again later.',
            code: 'MAX_ATTEMPTS_REACHED',
          });
          return;
        } else {
          // Resetear contador de intentos después de 1 hora
          if (user.security?.security) {
            user.security.security.emailVerificationAttempts = 0;
          }
        }
      }

      // Generar código de 6 dígitos
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      // Inicializar estructura security si no existe
      if (!user.security) {
        user.security = { security: {}, devices: [] };
      }
      if (!user.security.security) {
        user.security.security = {};
      }

      // Guardar código en la base de datos
      user.security.security.emailVerificationCode = verificationCode;
      user.security.security.emailVerificationCodeExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );
      user.security.security.emailVerificationAttempts = attempts + 1;
      user.security.security.lastVerificationAttempt = now;
      user.security.security.lastEmailVerificationSent = now;
      user.security.security.pendingEmailVerification = emailToVerify;

      await user.save();

      // Enviar email con el código
      const lang = req.headers['accept-language']?.split(',')[0] || 'es';
      const emailService = EmailService.getInstance();
      const emailSent = await emailService.sendEmail({
        to: emailToVerify,
        subject: 'Verifica tu correo electrónico',
        template: 'email-verification',
        lang: lang,
        context: {
          userName: user.profile?.name || user.email,
          verificationCode,
          expiryMinutes: 10,
          year: new Date().getFullYear(),
          companyName: process.env.APP_NAME || 'PlaquitasCR',
          logoUrl: process.env.LOGO_URL,
          phoneNumber: process.env.PHONE_NUMBER,
          facebookUrl: process.env.FACEBOOK_URL,
          facebookUsername: process.env.FACEBOOK_USERNAME,
          instagramUrl: process.env.INSTAGRAM_URL,
          instagramUsername: process.env.INSTAGRAM_USERNAME,
          supportEmail: process.env.SUPPORT_EMAIL,
        },
      });

      if (!emailSent) {
        res.status(500).json({
          success: false,
          message: 'Error sending the verification code',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Verification code sent to your email address',
        payload: {
          email: emailToVerify,
          expiresIn: 10,
        },
      });
    } catch (error) {
      console.error('Error sending email verification:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
        code: error,
      });
    }
  }

  /**
   * Verificar código de email
   */
  async verifyEmailCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { code } = req.body;

      if (!code || code.length !== 6) {
        res.status(400).json({
          success: false,
          message: 'Invalid verification code. It must be 6 digits long.',
        });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const storedCode = user.security?.security?.emailVerificationCode;
      const expiresAt = user.security?.security?.emailVerificationCodeExpires;
      const pendingEmail = user.security?.security?.pendingEmailVerification;
      const now = new Date();

      // Verificar si existe código pendiente
      if (!storedCode || !expiresAt) {
        res.status(400).json({
          success: false,
          message: 'There is no pending verification code. Request a new one.',
          code: 'NO_CODE_PENDING',
        });
        return;
      }

      // Verificar si el código expiró
      if (expiresAt < now) {
        // Limpiar código expirado
        if (user.security?.security) {
          user.security.security.emailVerificationCode = undefined;
          user.security.security.emailVerificationCodeExpires = undefined;
          await user.save();
        }
        res.status(400).json({
          success: false,
          message: 'El código ha expirado. Por favor solicita uno nuevo.',
          code: 'CODE_EXPIRED',
        });
        return;
      }

      // Verificar si el código es correcto
      if (storedCode !== code) {
        res.status(400).json({
          success: false,
          message: 'Invalid code. Please try again.',
          code: 'INVALID_CODE',
        });
        return;
      }

      // Marcar email como verificado
      if (user.security?.security) {
        user.security.security.isEmailVerified = true;
        user.security.security.emailVerificationCode = undefined;
        user.security.security.emailVerificationCodeExpires = undefined;
        user.security.security.pendingEmailVerification = undefined;

        // Si se verificó un email diferente al principal, actualizarlo
        if (pendingEmail && pendingEmail !== user.email) {
          const oldEmail = user.email;
          user.email = pendingEmail;

          // Enviar notificación al email anterior
          const emailService = EmailService.getInstance();
          await emailService.sendEmail({
            to: oldEmail,
            subject: 'Correo electrónico actualizado',
            template: 'email-changed',
            lang: req.headers['accept-language']?.split(',')[0] || 'es',
            context: {
              userName: user.profile?.name || user.email,
              newEmail: pendingEmail,
              year: new Date().getFullYear(),
              companyName: process.env.APP_NAME || 'PlaquitasCR',
              logoUrl: process.env.LOGO_URL,
              phoneNumber: process.env.PHONE_NUMBER,
              facebookUrl: process.env.FACEBOOK_URL,
              facebookUsername: process.env.FACEBOOK_USERNAME,
              instagramUrl: process.env.INSTAGRAM_URL,
              instagramUsername: process.env.INSTAGRAM_USERNAME,
              supportEmail: process.env.SUPPORT_EMAIL,
            },
          });
        }

        await user.save();
      }

      res.json({
        success: true,
        message: 'Email address successfully verified',
        payload: {
          isEmailVerified: true,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('Error verifying email code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
      });
    }
  }

  /**
   * Reenviar código de verificación de email
   */
  async resendEmailVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id?.toString();
      const { email } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const emailToVerify = email || user.email;

      // Validar cooldown
      const now = Date.now();
      const lastSent = user.security?.security?.lastEmailVerificationSent || 0;
      const timeSinceLastSent = (now - lastSent) / 1000;

      if (timeSinceLastSent < 30) {
        // 30 segundos de cooldown para reenvío
        const remainingSeconds = Math.ceil(30 - timeSinceLastSent);
        res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} a few seconds before requesting another code`,
          code: 'RATE_LIMITED',
          remainingSeconds,
        });
        return;
      }

      // Generar nuevo código
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      if (!user.security) {
        user.security = { security: {}, devices: [] };
      }
      if (!user.security.security) {
        user.security.security = {};
      }

      user.security.security.emailVerificationCode = verificationCode;
      user.security.security.emailVerificationCodeExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );
      user.security.security.lastEmailVerificationSent = now;
      user.security.security.pendingEmailVerification = emailToVerify;

      await user.save();

      // Enviar email
      const lang = req.headers['accept-language']?.split(',')[0] || 'es';
      const emailService = EmailService.getInstance();
      await emailService.sendEmail({
        to: emailToVerify,
        subject: 'Check your email',
        template: 'email-verification',
        lang: lang,
        context: {
          userName: user.profile?.name || user.email,
          verificationCode,
          expiryMinutes: 10,
          year: new Date().getFullYear(),
          companyName: process.env.APP_NAME || 'PlaquitasCR',
          logoUrl: process.env.LOGO_URL,
          phoneNumber: process.env.PHONE_NUMBER,
          facebookUrl: process.env.FACEBOOK_URL,
          facebookUsername: process.env.FACEBOOK_USERNAME,
          instagramUrl: process.env.INSTAGRAM_URL,
          instagramUsername: process.env.INSTAGRAM_USERNAME,
          supportEmail: process.env.SUPPORT_EMAIL,
        },
      });

      res.json({
        success: true,
        message: 'Code successfully forwarded',
        payload: {
          email: emailToVerify,
          expiresIn: 10,
        },
      });
    } catch (error) {
      console.error('Error resending email verification:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error, please try again later.',
      });
    }
  }
}

export default new UserSecurityController();
