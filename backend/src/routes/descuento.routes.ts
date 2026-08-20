import { Router } from 'express';
import {
  listarDescuentos,
  vistaPreviaDescuento,
  aplicarDescuento,
  revertirDescuento,
  revertirDescuentoMasivo
} from '../controllers/descuento.controller';
import { verificarToken, verificarPermiso, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Lectura accesible con permiso de catálogo de productos
router.get('/', verificarPermiso('catalogoProductos'), listarDescuentos);

// Escrituras solo para gerentes
router.post('/vista-previa', soloGerente, vistaPreviaDescuento);
router.post('/revertir-masivo', soloGerente, revertirDescuentoMasivo);
router.post('/', soloGerente, aplicarDescuento);
router.delete('/:id', soloGerente, revertirDescuento);

export default router;