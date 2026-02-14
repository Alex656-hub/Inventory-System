import { Router } from 'express';
import salesController from '../controllers/salesController';
import { verificarToken, soloGerente, gerenteOEmpleado } from '../middleware/auth.middleware';

const router = Router();

// Importar ventas - requiere ser gerente
router.post('/import', verificarToken, soloGerente, ...salesController.uploadSales);

// Listar ventas - gerente o empleado
router.get('/', verificarToken, gerenteOEmpleado, salesController.getSales);

// Resumen ventas - gerente o empleado  
router.get('/summary', verificarToken, gerenteOEmpleado, salesController.getSalesSummary);

export default router;
