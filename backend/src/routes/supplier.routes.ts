import { Router } from 'express';
import {
  obtenerProveedores,
  obtenerProveedorPorId,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor
} from '../controllers/supplier.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles con permiso de proveedores
router.get('/', verificarPermiso('proveedores'), obtenerProveedores);
router.get('/:id', verificarPermiso('proveedores'), obtenerProveedorPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearProveedor);
router.put('/:id', soloGerente, actualizarProveedor);
router.delete('/:id', soloGerente, eliminarProveedor);

export default router;

