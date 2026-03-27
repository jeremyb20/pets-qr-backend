// back-end/routes/public.ts
import { getIpInfo } from '../controllers/ipController';
import express, { Router } from 'express';

const router = Router();

// Endpoints públicos (sin autenticación)
router.get('/ip-info', getIpInfo);
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
