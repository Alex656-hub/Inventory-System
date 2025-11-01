import { Router } from 'express';
import {
  obtenerProveedores,
  obtenerProveedorPorId,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor
} from '../controllers/supplier.controller';
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, obtenerProveedores);
router.get('/:id', gerenteOEmpleado, obtenerProveedorPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearProveedor);
router.put('/:id', soloGerente, actualizarProveedor);
router.delete('/:id', soloGerente, eliminarProveedor);

export default router;

