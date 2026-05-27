import { Router } from 'express';
import {
  obtenerConfiguracion,
  guardarConfiguracion,
  actualizarConfiguracion,
  eliminarLogo,
  uploadLogo
} from '../controllers/configuracion.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de ajustes (lectura)
router.get('/', verificarPermiso('ajustes'), obtenerConfiguracion);

// Rutas que requieren ser gerente (escritura)
router.post('/', soloGerente, uploadLogo, guardarConfiguracion);
router.put('/', soloGerente, actualizarConfiguracion);
router.delete('/logo', soloGerente, eliminarLogo);

export default router;
