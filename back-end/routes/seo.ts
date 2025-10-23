import { Router } from 'express';

import adminSeoCtrl from '../controllers/admin/admin-seo.controller';

const router = Router();

// Suscribirse a notificaciones push
router.get('/getSeoByPageId/:pageId', adminSeoCtrl.getSeoByPageId);
export default router;
