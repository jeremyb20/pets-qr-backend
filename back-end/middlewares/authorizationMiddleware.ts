import { Request, Response, NextFunction } from 'express';
import { ROLES, UserRole } from './authMiddleware';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Type assertion temporal hasta que se resuelvan los tipos
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        msg: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        msg: `Insufficient privileges. Required roles: ${allowedRoles.join(
          ', '
        )}`,
      });
      return;
    }

    next();
  };
};
