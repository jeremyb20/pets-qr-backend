import { Router } from 'express';
import userCtl from '../controllers/user.controller';
import verification from '../middlewares/config-legacy';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isAdminOrUser } from '../middlewares/roleMiddlewares';
import {
  uploadImages,
  uploadSingleImage,
} from '../middlewares/uploadMiddleware';

const router = Router();

router.post('/authenticate', userCtl.authenticateLegacy);

router.post('/email/sign-in', userCtl.authenticate);
router.post(
  '/email/registerAccountWithEmail',
  userCtl.registerAccountWithEmail
);

router.get('/me', authenticateToken, userCtl.me);

router.get('/getAllPetsByUser', authenticateToken, userCtl.getAllPetsByUser);

router.put('/updateMyProfile', authenticateToken, userCtl.updateMyProfile);

router.get('/getUserProfileById?:id', verification, userCtl.getUserProfileById);

router.get(
  '/getUserProfileByIdScanner/:idPrimary/:idSecondary',
  verification,
  userCtl.getUserProfileByIdScanner
);

router.get('/settings', authenticateToken, userCtl.getSettings);

router.put('/updateSettings', authenticateToken, userCtl.updateSettings);

router.get('/getMyPetCode', userCtl.getMyPetCode);

router.get('/getMyPetInfo', userCtl.getMyPetInfo);

router.put('/editProfileInfo', verification, userCtl.editProfileInfo);

router.put('/editPetProfile', verification, userCtl.editPetProfile);

router.put('/editPhotoProfile', verification, userCtl.editPhotoProfile);

router.put('/editThemeProfile', verification, userCtl.editThemeProfile);

router.put('/updatePetViewed', userCtl.updatePetViewed);

router.post('/registerNewPet', userCtl.registerNewPet);

router.post(
  '/registerNewPetByQRcode',
  uploadSingleImage,
  userCtl.registerNewPetByQRcode
);

router.post(
  '/registerNewPetfromUserProfile',
  verification,
  userCtl.registerNewPetfromUserProfile
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

router.post('/deletePetById', verification, userCtl.deletePetById);

router.post('/forgot', userCtl.forgot);

router.post('/reset-password', userCtl.resetPassword);

router.get('/validateQrCode?:code', userCtl.validateQrCode);

export default router;
