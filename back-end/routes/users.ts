import { Router } from 'express';
import userCtl from '../controllers/user.controller';
import verification from '../middlewares/config-legacy';
import { authenticateToken } from '../middlewares/authMiddleware';
import { uploadSingleImage } from '../middlewares/uploadMiddleware';
import promotionController from '../controllers/admin/admin-promotion.controller';
import UserSecurityController from '../controllers/userSecurity.controller';

const router = Router();

router.post('/email/sign-in', userCtl.authenticate);
router.post(
  '/email/registerAccountWithEmail',
  userCtl.registerAccountWithEmail
);

router.get('/me', authenticateToken, userCtl.me);

router.get('/getAllPetsByUser', authenticateToken, userCtl.getAllPetsByUser);

router.put('/updateMyProfile', authenticateToken, userCtl.updateMyProfile);

router.get('/settings', authenticateToken, userCtl.getSettings);

router.put('/updateSettings', authenticateToken, userCtl.updateSettings);

router.post(
  '/registerNewPetByQRcode',
  uploadSingleImage,
  userCtl.registerNewPetByQRcode
);

router.post(
  '/addPetToExistingUser',
  verification,
  uploadSingleImage,
  userCtl.addPetToExistingUser
);

router.post(
  '/addPetToAuthenticatedUser',
  authenticateToken,
  uploadSingleImage,
  userCtl.addPetToAuthenticatedUser
);

router.get('/validateQrCode/:code', userCtl.validateQrCode);

router.get('/getAllPublishedProductList', userCtl.getAllPublishedProductList);

router.get('/searchProducts', userCtl.searchProducts);

router.get('/getProductPublishedById', userCtl.getProductPublishedById);

router.put('/updatePassword', authenticateToken, userCtl.updatePassword);

router.post('/forgotPassword', userCtl.forgotPassword);

router.post('/resetPassword', userCtl.resetPassword);
router.post('/resend2FACodeForReset', userCtl.resend2FACodeForReset);

// Rutas públicas para usuarios
router.get('/getActivePromotions', promotionController.getActivePromotions);
router.get('/getFeaturedPromotion', promotionController.getFeaturedPromotion);
router.get('/validatePromoCode/:code', promotionController.validatePromoCode);
router.post('/usePromoCode/:code', promotionController.usePromoCode);

router.post('/registerPetView/:memberPetId', userCtl.registerPetView);

router.get(
  '/getSecurityConfig',
  authenticateToken,
  UserSecurityController.getSecurityConfig
);
router.put(
  '/updateSecurityConfig',
  authenticateToken,
  UserSecurityController.updateSecurityConfig
);
router.get(
  '/getAllMedicalAppointmentsByUser/:userId',
  authenticateToken,
  userCtl.getAllMedicalAppointmentsByUser
);

// ============================================
// AUTENTICACIÓN DE DOS FACTORES (2FA)
// ============================================

router.post('/enable2FA', authenticateToken, UserSecurityController.enable2FA);
router.post(
  '/verify2FACode',
  authenticateToken,
  UserSecurityController.verify2FACode
);
router.post(
  '/resend2FACode',
  authenticateToken,
  UserSecurityController.resend2FACode
);
router.post(
  '/disable2FA',
  authenticateToken,
  UserSecurityController.disable2FA
);

// ============================================
// GESTIÓN DE DISPOSITIVOS
// ============================================

router.get('/getDevices', authenticateToken, UserSecurityController.getDevices);
router.post(
  '/registerDevice',
  authenticateToken,
  UserSecurityController.registerDevice
);
router.delete(
  '/removeDevice/:deviceId',
  authenticateToken,
  UserSecurityController.removeDevice
);
router.post(
  '/signOutAllDevices',
  authenticateToken,
  UserSecurityController.signOutAllDevices
);

// ============================================
// VERIFICACIÓN DE CORREO ELECTRÓNICO
// ============================================
router.post(
  '/sendEmailVerification',
  authenticateToken,
  UserSecurityController.sendEmailVerification
);
router.post(
  '/verifyEmailCode',
  authenticateToken,
  UserSecurityController.verifyEmailCode
);
router.post(
  '/resendEmailVerification',
  authenticateToken,
  UserSecurityController.resendEmailVerification
);
export default router;
