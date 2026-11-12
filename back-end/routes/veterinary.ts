import { Router } from 'express';
import veterinaryController from '../controllers/veterinary.controller';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/me', veterinaryController.getMyVeterinaries);

router.get('/:veterinaryId', veterinaryController.getVeterinary);

router.get('/:veterinaryId/members', veterinaryController.getMembers);
router.post('/:veterinaryId/members', veterinaryController.addMember);
router.delete(
  '/:veterinaryId/members/:memberId',
  veterinaryController.removeMember
);

router.post('/:veterinaryId/owners', veterinaryController.createOwner);
router.get(
  '/:veterinaryId/owners/search',
  veterinaryController.searchOwnerCandidates
);

router.get('/:veterinaryId/pets', veterinaryController.getPets);
router.post(
  '/:veterinaryId/pets/:petId/associate',
  veterinaryController.associatePet
);

router.get(
  '/:veterinaryId/pets/:petId/clinical-record',
  veterinaryController.getClinicalRecord
);
router.patch(
  '/:veterinaryId/pets/:petId/clinical-record',
  veterinaryController.updateClinicalRecordNotes
);
router.post(
  '/:veterinaryId/pets/:petId/clinical-record/:section',
  veterinaryController.addClinicalRecordEntry
);
router.delete(
  '/:veterinaryId/pets/:petId/clinical-record/:section/:entryId',
  veterinaryController.deleteClinicalRecordEntry
);

export default router;
