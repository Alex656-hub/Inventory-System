// backend/src/routes/report.routes.ts
import { Router } from 'express';
import { generateReport } from '../controllers/ReportController';
import { verificarToken, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación y ser gerente
router.use(verificarToken);
router.use(soloGerente);

router.post('/generate', generateReport);

export default router;
