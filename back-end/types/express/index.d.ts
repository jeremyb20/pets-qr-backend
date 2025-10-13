import { IUser } from '@/models/User';
declare global {
  namespace Express {
    // Opción 1: Extender el User de Passport (recomendado si usas Passport)
    interface User extends IUser {}

    // Opción 2: Extender Request directamente (más simple)
    interface Request {
      user?: IUser | User; // Puedes usar IUser o User
    }
  }
}

// Export vacío para que sea un módulo
export {};
