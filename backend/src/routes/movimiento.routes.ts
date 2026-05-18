import { Router } from 'express';
import {
  obtenerMovimientos,
  obtenerKardexPorProducto,
  obtenerHistorialMovimientos,
  obtenerPreviewOperacion,
  obtenerPdfOperacion
} from '../controllers/movimiento.controller';
import { verificarToken, gerenteOEmpleado } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

router.get('/', gerenteOEmpleado, obtenerMovimientos);
router.get('/historial', gerenteOEmpleado, obtenerHistorialMovimientos);
router.get('/kardex/:id', gerenteOEmpleado, obtenerKardexPorProducto);
router.get('/:id/preview', gerenteOEmpleado, obtenerPreviewOperacion);
router.get('/:id/pdf', gerenteOEmpleado, obtenerPdfOperacion);

export default router;

