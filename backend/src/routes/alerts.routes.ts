import { Router } from 'express';
import {
  getAlerts,
  checkAlerts,
  resolveAlert,
  getRecommendations,
  generateRecommendations,
  getAnalytics,
  acceptRecommendation,
  rejectRecommendation,
  getRecommendationMetrics,
  getRecommendationHistory,
  reopenRecommendation
} from '../controllers/alertsController';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de alertas stock
router.get('/', verificarPermiso('alertasStock'), getAlerts);
router.get('/analytics', verificarPermiso('alertasStock'), getAnalytics);
router.get('/recommendations', verificarPermiso('alertasStock'), getRecommendations);
router.post('/recommendations/generate', soloGerente, generateRecommendations);
router.get('/recommendations/metrics', verificarPermiso('alertasStock'), getRecommendationMetrics);
router.get('/recommendations/history', verificarPermiso('alertasStock'), getRecommendationHistory);

// Rutas que requieren ser gerente (para ejecutar checks y resolver alertas)
router.post('/check', soloGerente, checkAlerts);
router.put('/:id/resolve', soloGerente, resolveAlert);

// Acciones de recomendaciones
router.put('/recommendations/:id/accept', soloGerente, acceptRecommendation);
router.put('/recommendations/:id/reject', soloGerente, rejectRecommendation);
router.put('/recommendations/:id/reopen', soloGerente, reopenRecommendation);

export default router;
