declare namespace NodeJS {
  interface ProcessEnv {
    // Base de datos
    BD_URL: string;
    MONGODB_URI?: string;

    // Servidor
    PORT?: string;
    NODE_ENV?: 'development' | 'production' | 'test';

    // Autenticación
    JWT_SECRET?: string;

    // Cloudinary
    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;

    // Email
    EMAIL_SERVICE?: string;
    EMAIL_USER?: string;
    EMAIL_PASS?: string;

    // Redis
    REDIS_URL?: string;

    // Otros
    [key: string]: string | undefined;
  }
}
