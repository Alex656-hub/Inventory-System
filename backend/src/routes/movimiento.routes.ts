import { Router } from 'express';
import {
  obtenerMovimientos,
  obtenerKardexPorProducto
} from '../controllers/movimiento.controller';
import { verificarToken, gerenteOEmpleado } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

router.get('/', gerenteOEmpleado, obtenerMovimientos);
router.get('/kardex/:id', gerenteOEmpleado, obtenerKardexPorProducto);

export default router;

