const { Router } = require('express');
const userCtl = require('../controllers/user.controller')
const router = Router();
const verification = require('./../config');

router.post('/authenticate', userCtl.authenticate);

router.get('/getUserProfileById?:id', verification, userCtl.getUserProfileById);

router.get('/getUserProfileByIdScanner/:idPrimary/:idSecondary', verification, userCtl.getUserProfileByIdScanner);

router.get('/getMyPetCode', userCtl.getMyPetCode);

router.get('/getMyPetInfo', userCtl.getMyPetInfo);

router.put('/editProfileInfo', verification, userCtl.editProfileInfo);

router.put('/editPetProfile', verification, userCtl.editPetProfile);

router.put('/editPhotoProfile', verification, userCtl.editPhotoProfile);

router.put('/editThemeProfile', verification, userCtl.editThemeProfile);

router.post('/registerNewPet', userCtl.registerNewPet);

router.post('/registerNewPetByQRcode', userCtl.registerNewPetByQRcode);

router.post('/registerNewPetfromUserProfile', verification, userCtl.registerNewPetfromUserProfile);

router.post('/deletePetById', verification, userCtl.deletePetById);

router.post('/forgot', userCtl.forgot);

router.post('/reset-password', userCtl.resetPassword);


//router.delete('/delete/:id/:secondid', async (req, res) => {

module.exports = router;
