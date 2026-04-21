import { Router } from 'express';
import { body } from 'express-validator';
import {
  obtenerAlmacenes,
  obtenerAlmacenPorId,
  crearAlmacen,
  actualizarAlmacen,
  eliminarAlmacen,
  toggleEstadoAlmacen,
  obtenerAlmacenesSelect,
  obtenerAlmacenesPorSede,
  obtenerEstadisticasAlmacenes
} from '../controllers/almacen.controller';

const router = Router();

// Validaciones para crear/actualizar almacén
const almacenValidation = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre del almacén es requerido')
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),
  body('codigo')
    .notEmpty()
    .withMessage('El código del almacén es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres'),
  body('sede_id')
    .isInt({ min: 1 })
    .withMessage('El ID de la sede debe ser un número entero positivo'),
  body('tipo')
    .isIn(['principal', 'secundario', 'temporal', 'virtual'])
    .withMessage('El tipo de almacén debe ser: principal, secundario, temporal o virtual'),
  body('capacidad')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La capacidad debe ser un número mayor o igual a 0'),
  body('unidad_capacidad')
    .optional()
    .isIn(['m2', 'm3', 'kg', 'ton', 'litros', 'unidades'])
    .withMessage('La unidad de capacidad debe ser: m2, m3, kg, ton, litros o unidades'),
  body('descripcion')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres')
];

// GET /api/almacenes - Obtener todos los almacenes con paginación y filtros
router.get('/', obtenerAlmacenes);

// GET /api/almacenes/select - Obtener almacenes activos para select
router.get('/select', obtenerAlmacenesSelect);

// GET /api/almacenes/estadisticas - Obtener estadísticas de almacenes
router.get('/estadisticas', obtenerEstadisticasAlmacenes);

// GET /api/almacenes/sede/:sede_id - Obtener almacenes por sede
router.get('/sede/:sede_id', obtenerAlmacenesPorSede);

// GET /api/almacenes/:id - Obtener un almacén por ID
router.get('/:id', obtenerAlmacenPorId);

// POST /api/almacenes - Crear un nuevo almacén
router.post('/', almacenValidation, crearAlmacen);

// PUT /api/almacenes/:id - Actualizar un almacén
router.put('/:id', almacenValidation, actualizarAlmacen);

// DELETE /api/almacenes/:id - Eliminar un almacén (cambio de estado)
router.delete('/:id', eliminarAlmacen);

// PATCH /api/almacenes/:id/toggle-estado - Activar/Desactivar almacén
router.patch('/:id/toggle-estado', toggleEstadoAlmacen);

export default router;
