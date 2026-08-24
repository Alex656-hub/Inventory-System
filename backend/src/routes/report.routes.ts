// backend/src/routes/report.routes.ts
import { Router } from 'express';
import { generateReport, generateKardexPDF, generateInventarioExcel, getInventarioData } from '../controllers/ReportController';
import { verificarToken, soloGerente, verificarPermiso } from '../middleware/auth.middleware';

const router = Router();

router.use(verificarToken);

router.get('/inventario-data', verificarPermiso('reporteInventario'), getInventarioData);
router.post('/generate', soloGerente, generateReport);
router.post('/kardex', soloGerente, generateKardexPDF);
router.post('/inventario', soloGerente, generateInventarioExcel);

export default router;
