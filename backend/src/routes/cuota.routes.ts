import { Router } from 'express';
import {
  getCuotasByCliente,
  getAging,
  getCartera,
  getAgingCliente,
  pagarCuota,
} from '../controllers/cuota.controller';
import { verificarToken, verificarPermiso } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación y permiso de operacionesStock
router.use(verificarToken);
router.use(verificarPermiso('operacionesStock'));

// Aging de cartera
router.get('/aging', getAging);
router.get('/aging/cliente/:clienteId', getAgingCliente);

// Cartera de clientes con saldo pendiente (antes de rutas paramétricas)
router.get('/cartera', getCartera);

// Cuotas por cliente
router.get('/cliente/:clienteId', getCuotasByCliente);

// Cobrar cuota
router.post('/:id/pay', pagarCuota);

export default router;