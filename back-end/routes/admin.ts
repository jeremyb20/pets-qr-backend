import { Router } from 'express';
import adminCtl from '../controllers/admin/admin.controller';
import adminProductCtl from '../controllers/admin/admin-products.controller';
import qrCodeController from '../controllers/qrcode.controller';
import verification from '../middlewares/config-legacy';
import { isAdmin } from '../middlewares/roleMiddlewares';
import { uploadImages } from '../middlewares/uploadMiddleware';
import { authenticateToken } from '../middlewares/authMiddleware';
import adminSeoCtrl from '../controllers/admin/admin-seo.controller';

const router = Router();

router.get('/getAllUsers', verification, adminCtl.getAllUsersLegacy); // obtiene todos los usuarios (legacy)

router.get(
  '/getAllRegisteredUsers',
  authenticateToken,
  isAdmin,
  adminCtl.getAllRegisteredUsers
);

router.put(
  '/updateUserById',
  authenticateToken,
  isAdmin,
  adminCtl.updateUserById
);

router.get('/getNewCodes', verification, adminCtl.getNewCodes);

router.delete('/deleteUserById?:id', verification, adminCtl.deleteUserById);

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

/// Admin Catalog Routes
// Product routes
router.get(
  '/product/list',
  authenticateToken,
  isAdmin,
  adminProductCtl.getAllProductList
);
router.get('/catalog', authenticateToken, isAdmin, adminProductCtl.getProducts);
router.get(
  '/stats',
  authenticateToken,
  isAdmin,
  adminProductCtl.getProductStats
);
router.get(
  '/product/details',
  authenticateToken,
  isAdmin,
  adminProductCtl.getProductById
);
router.post('/createProduct', uploadImages, adminProductCtl.createProduct);
router.put(
  '/updateProduct',
  authenticateToken,
  isAdmin,
  uploadImages,
  adminProductCtl.updateProduct
);
router.delete(
  '/:id',
  authenticateToken,
  isAdmin,
  adminProductCtl.deleteProduct
);
router.delete(
  '/',
  authenticateToken,
  isAdmin,
  adminProductCtl.bulkDeleteProducts
);

// Review routes
router.get(
  '/:productId/reviews',
  authenticateToken,
  isAdmin,
  adminProductCtl.getProductReviews
);
router.post(
  '/:productId/reviews',
  authenticateToken,
  isAdmin,
  adminProductCtl.createProductReview
);
router.put(
  '/reviews/:reviewId',
  authenticateToken,
  isAdmin,
  adminProductCtl.updateProductReview
);
router.delete(
  '/:productId/reviews/:reviewId',
  authenticateToken,
  isAdmin,
  adminProductCtl.deleteProductReview
);

router.get(
  '/getAllQrCodeList',
  authenticateToken,
  isAdmin,
  qrCodeController.getAllQrCodeList
);

router.get(
  '/getQRStats',
  authenticateToken,
  isAdmin,
  qrCodeController.getQRStats
);

router.put(
  '/updateQRCode',
  authenticateToken,
  isAdmin,
  qrCodeController.updateQRCode
);

// SEO

router.get(
  '/getAllSeoList',
  authenticateToken,
  isAdmin,
  adminSeoCtrl.getAllSeoList
);

router.post('/createSeo', authenticateToken, isAdmin, adminSeoCtrl.createSeo);

router.put(
  '/updateSeoById',
  authenticateToken,
  isAdmin,
  adminSeoCtrl.updateSeoById
);

router.get('/getSeoById', adminSeoCtrl.getSeoById);

router.get(
  '/users/getUserStats',
  authenticateToken,
  isAdmin,
  adminCtl.getUserStats
);

router.get(
  '/users/getUserGrowth',
  authenticateToken,
  isAdmin,
  adminCtl.getUserGrowth
);

router.get(
  '/users/getPetStats',
  authenticateToken,
  isAdmin,
  adminCtl.getPetStats
);

router.get(
  '/users/getPetGrowth',
  authenticateToken,
  isAdmin,
  adminCtl.getPetGrowth
);

router.get(
  '/products/getAdminProductStats',
  authenticateToken,
  isAdmin,
  adminProductCtl.getAdminProductStats
);

router.get(
  '/products/getProductGrowth',
  authenticateToken,
  isAdmin,
  adminProductCtl.getProductGrowth
);

export default router;
