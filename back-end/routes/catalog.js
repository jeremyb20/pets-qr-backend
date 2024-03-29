const { Router } = require('express');
const catalogCtl = require('../controllers/catalog.controller')
const router = Router();

router.get('/getAllInventoryList', catalogCtl.getAllInventoryList);

router.get('/getCatalogList', catalogCtl.getCatalogList);

router.get('/getPromoList', catalogCtl.getPromoList);

router.post('/createCatalog', catalogCtl.createCatalog);

router.get('/getCatalogById?:id', catalogCtl.getCatalogById);

router.put('/editCatalog', catalogCtl.editCatalog);

router.delete('/deleteCatalog?:id', catalogCtl.deleteCatalog);

router.post('/addCatalogImages', catalogCtl.addCatalogImages);

router.post('/deleteImageCatalog', catalogCtl.deleteImageCatalog);

module.exports = router;
