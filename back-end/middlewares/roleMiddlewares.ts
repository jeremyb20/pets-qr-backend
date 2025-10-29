// middlewares/roleMiddlewares.ts
import { ROLES } from './authMiddleware';
import { requireRole } from './authorizationMiddleware';

// Middlewares predefinidos para cada rol
export const isAdmin = requireRole([ROLES.ADMIN]);
export const isVeterinarian = requireRole([ROLES.VETERINARIAN]);
export const isGroomer = requireRole([ROLES.GROOMER]);
export const isUser = requireRole([ROLES.USER]);

// Combinaciones comunes de roles
export const isStaff = requireRole([
  ROLES.ADMIN,
  ROLES.VETERINARIAN,
  ROLES.GROOMER,
]);
export const isVeterinarianOrAdmin = requireRole([
  ROLES.ADMIN,
  ROLES.VETERINARIAN,
]);
export const isGroomerOrAdmin = requireRole([ROLES.ADMIN, ROLES.GROOMER]);
export const isVeterinarianOrGroomer = requireRole([
  ROLES.VETERINARIAN,
  ROLES.GROOMER,
]);

export const isAdminOrUser = requireRole([ROLES.ADMIN, ROLES.USER]);
