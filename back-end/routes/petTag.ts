import { PetTagOrderController } from '../controllers/petTag.controller';
import { Router } from 'express';
import multer from 'multer';
import { isAdmin } from '../middlewares/roleMiddlewares';
import { authenticateToken } from '../middlewares/authMiddleware';
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/createOrder', upload.any(), PetTagOrderController.createOrder);
router.get(
  '/getAllOrders',
  authenticateToken,
  isAdmin,
  PetTagOrderController.getAllOrders
);
router.get(
  '/getOrderById/:id',
  authenticateToken,
  isAdmin,
  PetTagOrderController.getOrderById
);

export default router;
