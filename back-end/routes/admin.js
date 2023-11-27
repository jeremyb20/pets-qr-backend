const { Router } = require('express');
const adminCtl = require('../controllers/admin.controller')
const router = Router();
const verification = require('./../config')

router.get('/getAllUsers', verification, adminCtl.getAllUsers);

router.get('/getNewCodes', verification, adminCtl.getNewCodes);

router.delete('/deleteUserById?:id', verification, adminCtl.deleteUserById);

router.put('/editUser', verification, adminCtl.editUser);

router.post('/createNewCode', verification, adminCtl.createNewCode);

router.put('/updateStateActivationCode', verification, adminCtl.updateStateActivationCode);

module.exports = router;
