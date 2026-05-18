// backend/src/routes/report.routes.ts
import { Router } from 'express';
import { generateReport, generateKardexPDF, generateInventarioExcel, getInventarioData } from '../controllers/ReportController';
import { verificarToken, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación y ser gerente
router.use(verificarToken);
router.use(soloGerente);

router.post('/generate', generateReport);
router.post('/kardex', generateKardexPDF);
router.post('/inventario', generateInventarioExcel);
router.get('/inventario-data', getInventarioData);

export default router;
