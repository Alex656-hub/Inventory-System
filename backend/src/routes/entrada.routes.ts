import { Router } from 'express';
import {
  obtenerEntradas,
  obtenerEntradaPorId,
  crearEntrada,
  eliminarEntrada
} from '../controllers/entrada.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de operaciones stock
router.get('/', verificarPermiso('operacionesStock'), obtenerEntradas);
router.get('/:id', verificarPermiso('operacionesStock'), obtenerEntradaPorId);
router.post('/', verificarPermiso('operacionesStock'), crearEntrada);
router.delete('/:id', soloGerente, eliminarEntrada);

export default router;

