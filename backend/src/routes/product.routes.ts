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
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();

router.use(verificarToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', verificarPermiso('catalogoProductos'), obtenerProductos);
router.get('/stock-bajo', verificarPermiso('catalogoProductos'), obtenerProductosStockBajo);
router.get('/next-code/:categoria_id', verificarPermiso('catalogoProductos'), obtenerSiguienteCodigo);
router.get('/:id', verificarPermiso('catalogoProductos'), obtenerProductoPorId);

router.post('/', soloGerente, upload.single('image'), crearProducto);
router.put('/:id', soloGerente, upload.single('image'), actualizarProducto);
router.delete('/:id', soloGerente, eliminarProducto);

export default router;