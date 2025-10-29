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
export default router;
