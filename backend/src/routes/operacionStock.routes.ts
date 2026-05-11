import { Router } from 'express';
import { body } from 'express-validator';
import operacionStockController from '../controllers/operacionStock.controller';
import { verificarToken } from '../middleware/auth.middleware';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(verificarToken);

// Validaciones para crear operación
const operacionValidation = [
  body('tipo_operacion')
    .isIn(['ENTRADA', 'SALIDA', 'TRASPASO'])
    .withMessage('Tipo de operación inválido'),
  body('responsable_fisico_id')
    .isInt({ min: 1 })
    .withMessage('El responsable físico es requerido'),
  body('detalles')
    .isArray({ min: 1 })
    .withMessage('Se debe incluir al menos un detalle'),
  body('detalles.*.producto_id')
    .isInt({ min: 1 })
    .withMessage('ID de producto inválido'),
  body('detalles.*.cantidad')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser mayor a 0'),
  body('detalles.*.costo_unitario')
    .isFloat({ min: 0 })
    .withMessage('El costo unitario debe ser mayor o igual a 0')
];

// Validaciones específicas por tipo de operación
const entradaValidation = [
  body('sede_destino_id')
    .isInt({ min: 1 })
    .withMessage('La sede destino es requerida para entradas'),
  body('proveedor_id')
    .isInt({ min: 1 })
    .withMessage('El proveedor es requerido para entradas')
];

const salidaValidation = [
  body('sede_origen_id')
    .isInt({ min: 1 })
    .withMessage('La sede origen es requerida para salidas')
];

const traspasoValidation = [
  body('sede_origen_id')
    .isInt({ min: 1 })
    .withMessage('La sede origen es requerida para traspasos'),
  body('sede_destino_id')
    .isInt({ min: 1 })
    .withMessage('La sede destino es requerida para traspasos'),
  body('motivo_traspaso')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('El motivo debe tener entre 3 y 200 caracteres')
];

// Rutas principales
router.post('/', operacionValidation, operacionStockController.crearOperacion);
router.get('/', operacionStockController.listarOperaciones);
router.get('/:id', operacionStockController.listarOperaciones); // Reutilizar método para obtener uno específico

// Rutas de procesamiento
router.put('/:id/procesar', operacionStockController.procesarOperacion);

// Rutas de consulta
router.get('/stock/disponible/:productoId/:sedeId', operacionStockController.obtenerStockDisponible);

export default router;
