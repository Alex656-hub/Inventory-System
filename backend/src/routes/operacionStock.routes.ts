import { Router } from 'express';
import { body, query } from 'express-validator';
import operacionStockController from '../controllers/operacionStock.controller';
import stockService from '../services/stock.service';
import { verificarToken, verificarPermiso } from '../middleware/auth.middleware';

const router = Router();

// Middleware de autenticación y permiso para todas las rutas
router.use(verificarToken);
router.use(verificarPermiso('operacionesStock'));

// Validaciones para crear operación
const operacionValidation = [
  body('tipo_operacion')
    .isIn(['ENTRADA', 'SALIDA', 'TRASPASO'])
    .withMessage('Tipo de operación inválido'),
  body('personal_id')
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

// Rutas de consulta (antes de /:id para evitar conflicto)
router.get('/productos/buscar', async (req, res) => {
  try {
    const { termino, sedeId } = req.query;
    const productos = await stockService.buscarProductosParaOperacion(
      termino as string || '',
      sedeId ? parseInt(sedeId as string) : undefined
    );
    res.json(productos);
  } catch (error) {
    console.error('Error al buscar productos:', error);
    res.status(500).json({ message: 'Error al buscar productos' });
  }
});

router.get('/stock/disponible/:productoId/:sedeId', operacionStockController.obtenerStockDisponible);

// Rutas principales
router.post('/', operacionValidation, operacionStockController.crearOperacion);
router.get('/', operacionStockController.listarOperaciones);
router.get('/:id', operacionStockController.listarOperaciones); // Reutilizar método para obtener uno específico

// Rutas de procesamiento
router.put('/:id/procesar', operacionStockController.procesarOperacion);

export default router;
