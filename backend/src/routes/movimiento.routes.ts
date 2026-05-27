import { Router } from 'express';
import {
  obtenerMovimientos,
  obtenerKardexPorProducto,
  obtenerHistorialMovimientos,
  obtenerPreviewOperacion,
  obtenerPdfOperacion
} from '../controllers/movimiento.controller';
import { verificarToken, verificarPermiso } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

router.get('/', verificarPermiso('historialKardex'), obtenerMovimientos);
router.get('/historial', verificarPermiso('historialKardex'), obtenerHistorialMovimientos);
router.get('/kardex/:id', verificarPermiso('historialKardex'), obtenerKardexPorProducto);
router.get('/:id/preview', verificarPermiso('historialKardex'), obtenerPreviewOperacion);
router.get('/:id/pdf', verificarPermiso('historialKardex'), obtenerPdfOperacion);

export default router;

