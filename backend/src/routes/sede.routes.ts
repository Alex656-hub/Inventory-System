import { Router } from 'express';
import { body } from 'express-validator';
import { verificarToken, verificarPermiso } from '../middleware/auth.middleware';
import {
  obtenerSedes,
  obtenerSedePorId,
  crearSede,
  actualizarSede,
  eliminarSede,
  toggleEstadoSede,
  obtenerSedesSelect,
  obtenerEstadisticasSedes
} from '../controllers/sede.controller';

const router = Router();

router.use(verificarToken);
router.use(verificarPermiso('sedesAlmacenes'));

// Validaciones para crear/actualizar sede
const sedeValidation = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre de la sede es requerido')
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),
  body('tipo')
    .isIn(['tienda', 'almacen', 'oficina', 'bodega'])
    .withMessage('El tipo de sede debe ser: tienda, almacen, oficina o bodega'),
  body('direccion')
    .notEmpty()
    .withMessage('La dirección es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('La dirección debe tener entre 5 y 500 caracteres'),
  body('telefono')
    .optional()
    .isLength({ min: 7, max: 20 })
    .withMessage('El teléfono debe tener entre 7 y 20 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('El email debe ser válido')
    .normalizeEmail(),
  body('responsable')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre del responsable debe tener entre 3 y 100 caracteres')
];

// GET /api/sedes - Obtener todas las sedes con paginación y filtros
router.get('/', obtenerSedes);

// GET /api/sedes/select - Obtener sedes activas para select
router.get('/select', obtenerSedesSelect);

// GET /api/sedes/estadisticas - Obtener estadísticas de sedes
router.get('/estadisticas', obtenerEstadisticasSedes);

// GET /api/sedes/:id - Obtener una sede por ID
router.get('/:id', obtenerSedePorId);

// POST /api/sedes - Crear una nueva sede
router.post('/', sedeValidation, crearSede);

// PUT /api/sedes/:id - Actualizar una sede
router.put('/:id', sedeValidation, actualizarSede);

// DELETE /api/sedes/:id - Eliminar una sede (cambio de estado)
router.delete('/:id', eliminarSede);

// PATCH /api/sedes/:id/toggle-estado - Activar/Desactivar sede
router.patch('/:id/toggle-estado', toggleEstadoSede);

export default router;
