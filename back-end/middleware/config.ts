// const jwt = require('jsonwebtoken');

// const verification = function verifyToken(req, res, next) {
//   if (!req.headers.authorization) {
//     return res.json({ success: false, msg: 'You do not have permissions for this view' });
//   }

//   const token = req.headers.authorization.split(' ')[1];

//   if (!token) {
//     return res.json({ success: false, msg: 'Token no existe.' });
//   }

//   jwt.verify(token, process.env.SECRET, function(err, decoded) {
//     if (err) {
//       return res.json({ success: false, msg: 'Token ya expiró, inicie sesión nuevamente' });
//     }

//     req.user = decoded;
//     next();
//   });
// }

// module.exports = verification;

// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import 'dotenv/config';

// const verification = function verifyToken(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): void {
//   try {
//     if (!req.headers.authorization) {
//       res.status(401).json({
//         success: false,
//         msg: 'Authorization header required',
//       });
//       return;
//     }

//     const authHeader = req.headers.authorization;

//     // Extraer token considerando múltiples formatos
//     const parts = authHeader.split(' ');
//     let token: string;

//     if (parts.length === 2) {
//       // Formato: "Bearer token" o "JWT token"
//       token = parts[1];
//     } else if (
//       parts.length === 3 &&
//       parts[0] === 'Bearer' &&
//       parts[1] === 'JWT'
//     ) {
//       // Formato: "Bearer JWT token"
//       token = parts[2];
//     } else {
//       // Token sin prefijo
//       token = authHeader;
//     }

//     if (!token || token === 'null' || token === 'undefined') {
//       res.status(401).json({
//         success: false,
//         msg: 'Token no válido',
//       });
//       return;
//     }

//     console.log('Token a verificar:', token.substring(0, 20) + '...'); // Debug

//     jwt.verify(
//       token,
//       process.env.SECRET as string,
//       (err: any, decoded: any) => {
//         if (err) {
//           console.log('Error verifying token:', err.name);

//           if (err.name === 'TokenExpiredError') {
//             res.status(401).json({
//               success: false,
//               msg: 'Token expirado, inicie sesión nuevamente',
//             });
//           } else {
//             res.status(401).json({
//               success: false,
//               msg: 'Token inválido',
//             });
//           }
//           return;
//         }

//         (req as any).user = decoded;
//         next();
//       }
//     );
//   } catch (error) {
//     console.error('Error in auth middleware:', error);
//     res.status(500).json({
//       success: false,
//       msg: 'Error interno del servidor',
//     });
//     return;
//   }
// };

// export default verification;

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

  // CAMBIO: Esperar formato "JWT token" en vez de "Bearer token"
  if (authHeader.startsWith('JWT ')) {
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
          res.status(401).json({
            success: false,
            msg: 'Token ya expiró, inicie sesión nuevamente',
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
      msg: 'Formato de autorización incorrecto. Use: JWT <token>',
    });
    return;
  }
};

export default verification;
