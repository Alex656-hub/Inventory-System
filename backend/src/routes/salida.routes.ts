import { Router } from 'express';
import {
  obtenerSalidas,
  obtenerSalidaPorId,
  crearSalida,
  eliminarSalida
} from '../controllers/salida.controller';
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, obtenerSalidas);
router.get('/:id', gerenteOEmpleado, obtenerSalidaPorId);
router.post('/', gerenteOEmpleado, crearSalida); // Empleados pueden registrar ventas

// Rutas que requieren ser gerente
router.delete('/:id', soloGerente, eliminarSalida);

export default router;

