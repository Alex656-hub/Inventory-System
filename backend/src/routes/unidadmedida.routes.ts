import { Router } from 'express';
import {
  obtenerUnidades,
  obtenerUnidadPorId,
  crearUnidad,
  actualizarUnidad,
  eliminarUnidad,
  desactivarUnidad,
  activarUnidad,
  eliminarUnidadHard
} from '../controllers/unidadmedida.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de unidades
router.get('/', verificarPermiso('unidades'), obtenerUnidades);
router.get('/:id', verificarPermiso('unidades'), obtenerUnidadPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearUnidad);
router.put('/:id', soloGerente, actualizarUnidad);
router.put('/:id/desactivar', soloGerente, desactivarUnidad);
router.put('/:id/activar', soloGerente, activarUnidad);
router.delete('/:id', soloGerente, eliminarUnidad);
router.delete('/hard/:id', soloGerente, eliminarUnidadHard);

export default router;
