import { Router } from 'express';

import PetController from '../controllers/pet.controller';
import userCtl from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/authMiddleware';
import { uploadSingleImage } from '../middlewares/uploadMiddleware';

const router = Router();

router.get('/getPublicProfileById/:id', PetController.getPublicProfileById);
router.get('/getProfileById/:id', authenticateToken, PetController.getProfileById);


router.put(
  '/updatePetById',
  authenticateToken,
  uploadSingleImage,
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
router.get('/getUserPetStats', authenticateToken, userCtl.getUserPetStats);

router.get(
  '/upcoming-appointments',
  authenticateToken,
  userCtl.getUserUpcomingAppointments
);

// Obtener próximas citas agrupadas por mascota
router.get(
  '/upcoming-appointments/grouped',
  authenticateToken,
  userCtl.getUserUpcomingAppointmentsGrouped
);
export default router;
