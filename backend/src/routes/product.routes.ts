import { Router } from 'express';
import {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerProductosStockBajo,
  obtenerSiguienteCodigo
} from '../controllers/product.controller';
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, obtenerProductos);
router.get('/stock-bajo', gerenteOEmpleado, obtenerProductosStockBajo);
router.get('/next-code/:categoria_id', gerenteOEmpleado, obtenerSiguienteCodigo);
router.get('/:id', gerenteOEmpleado, obtenerProductoPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearProducto);
router.put('/:id', soloGerente, actualizarProducto);
router.delete('/:id', soloGerente, eliminarProducto);

export default router;

