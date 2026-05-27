import { Router } from 'express';
import {
  getAlerts,
  checkAlerts,
  resolveAlert,
  getRecommendations,
  getAnalytics
} from '../controllers/alertsController';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de alertas stock
router.get('/', verificarPermiso('alertasStock'), getAlerts);
router.get('/analytics', verificarPermiso('alertasStock'), getAnalytics);
router.get('/recommendations', verificarPermiso('alertasStock'), getRecommendations);

// Rutas que requieren ser gerente (para ejecutar checks y resolver alertas)
router.post('/check', soloGerente, checkAlerts);
router.put('/:id/resolve', soloGerente, resolveAlert);

export default router;
