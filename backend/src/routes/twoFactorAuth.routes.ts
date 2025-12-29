// backend/src/routes/twoFactorAuth.routes.ts
import { Router } from 'express';
import { verificarToken } from '../middleware/auth.middleware';
import * as twoFactorController from '../controllers/twoFactorAuth.controller';

const router = Router();

// Ruta para configurar 2FA (requiere autenticación)
router.post('/configurar', verificarToken, twoFactorController.configurar2FA);

// Ruta para verificar código 2FA y activar (requiere autenticación)
router.post('/verificar', verificarToken, twoFactorController.verificar2FA);

// Ruta para desactivar 2FA (requiere autenticación)
router.post('/desactivar', verificarToken, twoFactorController.desactivar2FA);

// Ruta para verificar código 2FA durante el login (no requiere autenticación)
router.post('/verificar-login', twoFactorController.verificarLogin2FA);

export default router;