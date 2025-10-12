// const { Router } = require('express');
// const userCtl = require('../controllers/user.controller')
// const router = Router();
// const verification = require('../middleware/config');

// router.post('/authenticate', userCtl.authenticateLegacy);

// router.post('/email/sign-in', userCtl.authenticate);

// router.get('/me', verification, userCtl.me);

// router.get('/getUserProfileById?:id', verification, userCtl.getUserProfileById);

// router.get('/getUserProfileByIdScanner/:idPrimary/:idSecondary', verification, userCtl.getUserProfileByIdScanner);

// router.get('/getMyPetCode', userCtl.getMyPetCode);

// router.get('/getMyPetInfo', userCtl.getMyPetInfo);

// router.put('/editProfileInfo', verification, userCtl.editProfileInfo);

// router.put('/editPetProfile', verification, userCtl.editPetProfile);

// router.put('/editPhotoProfile', verification, userCtl.editPhotoProfile);

// router.put('/editThemeProfile', verification, userCtl.editThemeProfile);

// router.put('/updatePetViewed', userCtl.updatePetViewed);

// router.post('/registerNewPet', userCtl.registerNewPet);

// router.post('/registerNewPetByQRcode', userCtl.registerNewPetByQRcode);

// router.post('/registerNewPetfromUserProfile', verification, userCtl.registerNewPetfromUserProfile);

// router.post('/deletePetById', verification, userCtl.deletePetById);

// router.post('/forgot', userCtl.forgot);

// router.post('/reset-password', userCtl.resetPassword);

// //router.delete('/delete/:id/:secondid', async (req, res) => {

// module.exports = router;

import { Router } from 'express';
import userCtl from '../controllers/user.controller';
import verification from '../middleware/config';

const router = Router();

router.post('/authenticate', userCtl.authenticateLegacy);

router.post('/email/sign-in', userCtl.authenticate);

router.get('/me', verification, userCtl.me);

router.get('/getUserProfileById?:id', verification, userCtl.getUserProfileById);

router.get(
  '/getUserProfileByIdScanner/:idPrimary/:idSecondary',
  verification,
  userCtl.getUserProfileByIdScanner
);

router.get('/getMyPetCode', userCtl.getMyPetCode);

router.get('/getMyPetInfo', userCtl.getMyPetInfo);

router.put('/editProfileInfo', verification, userCtl.editProfileInfo);

router.put('/editPetProfile', verification, userCtl.editPetProfile);

router.put('/editPhotoProfile', verification, userCtl.editPhotoProfile);

router.put('/editThemeProfile', verification, userCtl.editThemeProfile);

router.put('/updatePetViewed', userCtl.updatePetViewed);

router.post('/registerNewPet', userCtl.registerNewPet);

router.post('/registerNewPetByQRcode', userCtl.registerNewPetByQRcode);

router.post(
  '/registerNewPetfromUserProfile',
  verification,
  userCtl.registerNewPetfromUserProfile
);

router.post('/deletePetById', verification, userCtl.deletePetById);

router.post('/forgot', userCtl.forgot);

router.post('/reset-password', userCtl.resetPassword);

export default router;
