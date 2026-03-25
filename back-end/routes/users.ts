import { Router } from 'express';
import userCtl from '../controllers/user.controller';
import verification from '../middlewares/config-legacy';
import { authenticateToken } from '../middlewares/authMiddleware';
import { uploadSingleImage } from '../middlewares/uploadMiddleware';
import promotionController from '../controllers/admin/admin-promotion.controller';

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

router.get('/validateQrCode?:code', userCtl.validateQrCode);

router.get('/getAllPublishedProductList', userCtl.getAllPublishedProductList);

router.get('/searchProducts', userCtl.searchProducts);

router.get('/getProductPublishedById', userCtl.getProductPublishedById);

router.put('/updatePassword', authenticateToken, userCtl.updatePassword);

router.post('/forgotPassword', userCtl.forgotPassword);

router.post('/resetPassword', userCtl.resetPassword);

// Rutas públicas para usuarios
router.get('/getActivePromotions', promotionController.getActivePromotions);
router.get('/getFeaturedPromotion', promotionController.getFeaturedPromotion);
router.get('/validatePromoCode/:code', promotionController.validatePromoCode);
router.post('/usePromoCode/:code', promotionController.usePromoCode);

export default router;
