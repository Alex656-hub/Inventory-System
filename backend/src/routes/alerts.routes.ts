import { Router } from 'express';
import {
  getAlerts,
  checkAlerts,
  resolveAlert,
  getRecommendations
} from '../controllers/alertsController';
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, getAlerts);
router.get('/recommendations', gerenteOEmpleado, getRecommendations);

// Rutas que requieren ser gerente (para ejecutar checks y resolver alertas)
router.post('/check', soloGerente, checkAlerts);
router.put('/:id/resolve', soloGerente, resolveAlert);

export default router;
