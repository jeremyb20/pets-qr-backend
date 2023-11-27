const { Router } = require('express');
const userCtl = require('../controllers/user.controller')
const router = Router();
const verification = require('./../config');

router.get('/getUserProfileById?:id', verification, userCtl.getUserProfileById);

router.get('/getMyPetCode', userCtl.getMyPetCode);

router.put('/editProfileInfo', verification, userCtl.editProfileInfo);

router.put('/editProfileSecondaryInfo', verification, userCtl.editProfileSecondaryInfo);

router.post('/registerNewPet', userCtl.registerNewPet);

router.post('/registerNewPetByQRcode', userCtl.registerNewPetByQRcode);

router.post('/registerNewPetfromUserProfile', verification, userCtl.registerNewPetfromUserProfile);

router.post('/deletePetById', verification, userCtl.deletePetById);

//router.delete('/delete/:id/:secondid', async (req, res) => {

module.exports = router;
