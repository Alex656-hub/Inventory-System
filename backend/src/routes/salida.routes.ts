import { Router } from 'express';
import {
  obtenerSalidas,
  obtenerSalidaPorId,
  crearSalida,
  eliminarSalida
} from '../controllers/salida.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de operaciones stock
router.get('/', verificarPermiso('operacionesStock'), obtenerSalidas);
router.get('/:id', verificarPermiso('operacionesStock'), obtenerSalidaPorId);
router.post('/', verificarPermiso('operacionesStock'), crearSalida);
router.delete('/:id', soloGerente, eliminarSalida);

export default router;

