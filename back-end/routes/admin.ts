import { Router } from 'express';
import adminCtl from '../controllers/admin.controller';
import verification from '../middlewares/config-legacy';
import { isAdmin } from '../middlewares/roleMiddlewares';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/getAllUsers', verification, adminCtl.getAllUsersLegacy); // obtiene todos los usuarios (legacy)

router.get(
  '/getAllRegisteredUsers',
  authenticateToken,
  isAdmin,
  adminCtl.getAllRegisteredUsers
); // obtiene todos los usuarios registrados (nueva version)

router.get('/getNewCodes', verification, adminCtl.getNewCodes);

router.delete('/deleteUserById?:id', verification, adminCtl.deleteUserById);

router.put('/editUser', verification, adminCtl.editUser);

router.put('/editUserSecondLevel', verification, adminCtl.editUserSecondLevel);

router.post('/createNewCode', verification, adminCtl.createNewCode);

router.put(
  '/updateStateActivationCode',
  verification,
  adminCtl.updateStateActivationCode
);

router.get('/getLocationAllPets', verification, adminCtl.getLocationAllPets);

router.post(
  '/deletePetByIdForAdmin',
  verification,
  adminCtl.deletePetByIdForAdmin
);

router.put('/updateFirstProfile', verification, adminCtl.updateFirstProfile);

router.put('/sortNewPetProfile', verification, adminCtl.sortNewPetProfile);

router.put('/updateLocationPet', verification, adminCtl.updateLocationPet);

export default router;
