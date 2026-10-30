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

    // Cloudflare R2 (almacenamiento de imágenes)
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_PUBLIC_URL?: string;

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
