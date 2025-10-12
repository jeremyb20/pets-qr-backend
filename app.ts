// const express = require('express');
// const morgan = require('morgan');
// const multer = require('multer');
// const path = require('path');
// const cors = require('cors');
// const compression = require('compression');
// require('dotenv').config();
// require('./back-end/config/redis'); // Inicializar Redis
// const app = express();
// const NotificationScheduler = require('./back-end/services/notificationScheduler');

// //settings
// app.set('views', path.join(__dirname, 'public'));
// const corsOptions = {
//   origin: [
//     'http://localhost:3000',
//     'http://localhost:8083',
//     'https://normal-actively-bug.ngrok-free.app',
//     'https://*.ngrok-free.app',
//     'https://*.ngrok.io',
//   ],
//   credentials: true,
//   optionsSuccessStatus: 200,
// };

// app.use(cors(corsOptions));
// app.use(morgan('dev'));
// app.use(express.json());
// app.use(
//   express.urlencoded({ limit: '50mb', extended: false, parameterLimit: 50000 })
// );
// app.use(compression());

// app.use(function (req, res, next) {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader(
//     'Access-Control-Allow-Methods',
//     'GET, POST, OPTIONS, PUT, PATCH, DELETE'
//   );
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token,Authorization'
//   );
//   res.header(
//     'Access-Control-Allow-Headers',
//     'Origin, X-Requested-With, Content-Type, Accept'
//   );
//   res.setHeader('Access-Control-Allow-Credentials', true);
//   next();
// });

// const storage = multer.diskStorage({
//   destination: path.join(__dirname, 'public/uploads'),
//   filename: (_req, file, cd) => {
//     cd(null, new Date().getTime() + path.extname(file.originalname));
//   },
// });
// app.use(multer({ storage }).single('image'));

// app.use('/api/admin', require('./back-end/routes/admin'));
// app.use('/api/user', require('./back-end/routes/users'));
// app.use('/api/catalog', require('./back-end/routes/catalog'));
// app.use('/api/notifications', require('./back-end/routes/notifications'));

// new NotificationScheduler();

// // Start Server
// app.use(express.static(__dirname + '/dist/plaquitas-cr'));
// app.get('/*', function (_req, res) {
//   res.sendFile(path.join(__dirname + '/dist/plaquitas-cr/index.html'));
// });

// module.exports = app;

import express, { Application, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { CorsOptions } from 'cors';

// Configuración de entorno
dotenv.config();

// Importar servicios y configuraciones
import './back-end/config/redis'; // Inicializar Redis
import NotificationScheduler from './back-end/services/notificationScheduler';

// Importar rutas
import adminRoutes from './back-end/routes/admin';
import userRoutes from './back-end/routes/users';
import catalogRoutes from './back-end/routes/catalog';
import notificationRoutes from './back-end/routes/notifications';

// Definir tipos para Multer
interface MulterFile extends Express.Multer.File {}

const app: Application = express();

// Configuración de CORS
const corsOptions: CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:8083',
    'https://normal-actively-bug.ngrok-free.app',
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middlewares básicos
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(
  express.urlencoded({
    limit: '50mb',
    extended: false,
    parameterLimit: 50000,
  })
);
app.use(compression());

// Middleware de CORS personalizado
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// Configuración de Multer
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (
    req: Express.Request,
    file: MulterFile,
    cb: (error: Error | null, filename: string) => void
  ): void => {
    const uniqueName = `${new Date().getTime()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

app.use(upload.single('image'));

// Rutas de la API
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/notifications', notificationRoutes);

// Inicializar el programador de notificaciones
new NotificationScheduler();

// Servir archivos estáticos para el frontend
app.use(express.static(path.join(__dirname, '../dist/plaquitas-cr')));

// Ruta catch-all para SPA
app.get('/*', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../dist/plaquitas-cr/index.html'));
});

// Manejo de errores global
app.use(
  (error: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Error global:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Máximo 10MB permitido.',
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
);

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default app;
