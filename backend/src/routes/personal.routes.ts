import { Router } from 'express';
import {
  obtenerPersonal,
  obtenerPersonalPorId,
  crearPersonal,
  actualizarPersonal,
  eliminarPersonal,
  eliminarPersonalHard
} from '../controllers/personal.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de personal
router.get('/', verificarPermiso('personal'), obtenerPersonal);
router.get('/:id', verificarPermiso('personal'), obtenerPersonalPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearPersonal);
router.put('/:id', soloGerente, actualizarPersonal);
router.delete('/:id', soloGerente, eliminarPersonal);
router.delete('/hard/:id', soloGerente, eliminarPersonalHard);

export default router;
