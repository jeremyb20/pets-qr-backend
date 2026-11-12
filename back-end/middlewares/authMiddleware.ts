import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Definir tipos para los roles
export const ROLES = {
  ADMIN: 'admin',
  VETERINARIAN: 'veterinarian',
  GROOMER: 'groomer',
  USER: 'user',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// Mapa temporal para tokens/documentos legados que aún usan números
const LEGACY_ROLE_MAP: Record<number, UserRole> = {
  0: ROLES.ADMIN,
  1: ROLES.VETERINARIAN,
  2: ROLES.GROOMER,
  3: ROLES.USER,
};

export const normalizeRole = (role: unknown): UserRole | null => {
  if (typeof role === 'string') {
    if (role === 'client') return ROLES.USER;
    return (Object.values(ROLES) as string[]).includes(role)
      ? (role as UserRole)
      : null;
  }

  if (typeof role === 'number') {
    return LEGACY_ROLE_MAP[role] ?? null;
  }

  return null;
};

// Middleware de autenticación (verificación del token)
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Use: Bearer <token>',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token not provided',
      });
      return;
    }

    jwt.verify(
      token,
      process.env.SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          console.log('JWT Verification Error:', err.name);

          let errorMsg = 'Invalid token';
          if (err.name === 'TokenExpiredError') {
            errorMsg = 'Token expired, please login again';
          } else if (err.name === 'JsonWebTokenError') {
            errorMsg = 'Malformed token';
          }

          res.status(401).json({
            success: false,
            message: errorMsg,
          });
          return;
        }

        (req as any).user = decoded;
        next();
      }
    );
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error, please try again later.',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Middleware básico para requerir autenticación
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!(req as any).user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }
  next();
};
