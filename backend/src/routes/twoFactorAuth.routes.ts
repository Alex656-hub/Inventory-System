// backend/src/routes/twoFactorAuth.routes.ts
import { Router } from 'express';
import { verificarToken } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rateLimit.middleware';
import * as twoFactorController from '../controllers/twoFactorAuth.controller';

const router = Router();

// Ruta para configurar 2FA (requiere autenticación)
router.post('/configurar', verificarToken, twoFactorController.configurar2FA);

// Ruta para verificar código 2FA y activar (requiere autenticación)
router.post('/verificar', verificarToken, twoFactorController.verificar2FA);

// Ruta para desactivar 2FA (requiere autenticación)
router.post('/desactivar', verificarToken, twoFactorController.desactivar2FA);

// Ruta para verificar código 2FA durante el login (no requiere autenticación)
// Rate limit: máx. 5 intentos por IP cada 15 minutos (mitiga fuerza bruta del TOTP)
router.post(
  '/verificar-login',
  rateLimit({ ventanaSegundos: 900, maxIntentos: 5, mensaje: 'Demasiados intentos de verificación. Espera 15 minutos e inicia sesión nuevamente.' }),
  twoFactorController.verificarLogin2FA
);

export default router;