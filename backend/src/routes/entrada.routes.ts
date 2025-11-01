import { Router } from 'express';
import {
  obtenerEntradas,
  obtenerEntradaPorId,
  crearEntrada,
  eliminarEntrada
} from '../controllers/entrada.controller';
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, obtenerEntradas);
router.get('/:id', gerenteOEmpleado, obtenerEntradaPorId);

// Rutas que requieren ser gerente para crear/eliminar
router.post('/', gerenteOEmpleado, crearEntrada); // Empleados también pueden registrar compras
router.delete('/:id', soloGerente, eliminarEntrada);

export default router;

