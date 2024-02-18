const { Router } = require('express');
const adminCtl = require('../controllers/admin.controller')
const router = Router();
const verification = require('./../config')

router.get('/getAllUsers', verification, adminCtl.getAllUsers);

router.get('/getNewCodes', verification, adminCtl.getNewCodes);

router.delete('/deleteUserById?:id', verification, adminCtl.deleteUserById);

router.put('/editUser', verification, adminCtl.editUser);

router.put('/editUserSecondLevel', verification, adminCtl.editUserSecondLevel);

router.post('/createNewCode', verification, adminCtl.createNewCode);

router.put('/updateStateActivationCode', verification, adminCtl.updateStateActivationCode);

router.get('/getLocationAllPets', verification, adminCtl.getLocationAllPets);

router.post('/deletePetByIdForAdmin', verification, adminCtl.deletePetByIdForAdmin);


module.exports = router;
