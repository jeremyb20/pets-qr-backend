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
import seoRoutes from './back-end/routes/seo';
import petRoutes from './back-end/routes/pet';

// Definir tipos para Multer
interface MulterFile extends Express.Multer.File { }

const app: Application = express();

// Configuración de CORS
const corsOptions: CorsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? [
        'https://plaquitascr.com',
        'https://www.plaquitascr.com',
        process.env.FRONTEND_URL || '', // Variable de entorno
      ].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:8083'],
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

// Health check endpoint (PRIMERO)
app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 1. RUTAS DE API (DEBEN IR ANTES DEL CATCH-ALL)
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/pet', petRoutes);

// 2. Servir archivos estáticos para el frontend (SOLO si existe)
app.use(express.static(path.join(__dirname, '../dist/plaquitas-cr')));

// 3. Ruta catch-all para SPA (PERO EXCLUYENDO /api/)
app.get('*', (req: Request, res: Response, next: NextFunction): void => {
  // EXCLUIR rutas que empiecen con /api/
  if (req.path.startsWith('/api/')) {
    console.log(`❌ API route not found: ${req.path}`);
    res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      path: req.path,
    });
    return;
  }

  // Si no es una ruta de API, intentar servir el SPA
  const spaPath = path.join(__dirname, '../dist/plaquitas-cr/index.html');

  // Verificar si el archivo existe antes de enviarlo
  const fs = require('fs');
  if (fs.existsSync(spaPath)) {
    res.sendFile(spaPath);
  } else {
    console.log(`❌ SPA file not found: ${spaPath}`);
    res.status(404).json({
      success: false,
      message: 'SPA file not found',
      path: req.path,
    });
  }
});

// Inicializar el programador de notificaciones
new NotificationScheduler();

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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
);

export default app;
