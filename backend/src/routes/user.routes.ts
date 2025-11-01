import { Router } from 'express';
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} from '../controllers/user.controller';
import { verificarToken, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación y solo el gerente puede acceder
router.use(verificarToken);
router.use(soloGerente);

router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuarioPorId);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

export default router;

