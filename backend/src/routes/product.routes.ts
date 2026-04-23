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
import multer from 'multer';

const router = Router();

router.use(verificarToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', gerenteOEmpleado, obtenerProductos);
router.get('/stock-bajo', gerenteOEmpleado, obtenerProductosStockBajo);
router.get('/next-code/:categoria_id', gerenteOEmpleado, obtenerSiguienteCodigo);
router.get('/:id', gerenteOEmpleado, obtenerProductoPorId);

router.post('/', soloGerente, upload.single('image'), crearProducto);
router.put('/:id', soloGerente, upload.single('image'), actualizarProducto);
router.delete('/:id', soloGerente, eliminarProducto);

export default router;