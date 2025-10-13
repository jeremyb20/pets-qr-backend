import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const verification = function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.headers.authorization) {
    res.status(401).json({
      success: false,
      msg: 'You do not have permissions for this view',
    });
    return;
  }

  const authHeader = req.headers.authorization;

  // CAMBIO: Usar formato estándar "Bearer token" en lugar de "JWT token"
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, msg: 'Token no existe.' });
      return;
    }

    jwt.verify(
      token,
      process.env.SECRET as string,
      function (err: any, decoded: any) {
        if (err) {
          console.log('JWT Verification Error:', err.name);

          // Mensajes de error más específicos
          let errorMsg = 'Token inválido';
          if (err.name === 'TokenExpiredError') {
            errorMsg = 'Token ya expiró, inicie sesión nuevamente';
          } else if (err.name === 'JsonWebTokenError') {
            errorMsg = 'Token malformado';
          }

          res.status(401).json({
            success: false,
            msg: errorMsg,
          });
          return;
        }

        (req as any).user = decoded;
        next();
      }
    );
  } else {
    res.status(401).json({
      success: false,
      msg: 'Formato de autorización incorrecto. Use: Bearer <token>',
    });
    return;
  }
};

export default verification;
