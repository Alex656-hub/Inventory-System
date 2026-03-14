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
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, obtenerUnidades);
router.get('/:id', gerenteOEmpleado, obtenerUnidadPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearUnidad);
router.put('/:id', soloGerente, actualizarUnidad);
router.put('/:id/desactivar', soloGerente, desactivarUnidad);
router.put('/:id/activar', soloGerente, activarUnidad);
router.delete('/:id', soloGerente, eliminarUnidad);
router.delete('/hard/:id', soloGerente, eliminarUnidadHard);

export default router;
