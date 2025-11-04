import { Router } from 'express';

import userCtl from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isAdmin, isAdminOrUser, isUser } from '../middlewares/roleMiddlewares';

const router = Router();

router.get('/getProfileById/:id', userCtl.getProfileById);

router.put(
  '/updatePetById',
  authenticateToken,
  isAdminOrUser,
  userCtl.updatePetById
);

router.get(
  '/getMedicalRecordsByPet',
  authenticateToken,
  userCtl.getMedicalRecordsByPet
);

router.post(
  '/createMedicalRecord',
  authenticateToken,
  userCtl.createMedicalRecord
);

router.put(
  '/updateMedicalRecord',
  authenticateToken,
  userCtl.updateMedicalRecord
);
export default router;
