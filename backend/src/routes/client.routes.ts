import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Client from '../models/Client';
import { verificarToken, verificarPermiso } from '../middleware/auth.middleware';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(verificarToken);
router.use(verificarPermiso('clientes'));

// Validaciones para crear cliente
const clientValidation = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre del cliente es requerido'),
  body('tipo_documento')
    .isIn(['DNI', 'RUC', 'PASAPORTE', 'OTRO'])
    .withMessage('Tipo de documento inválido'),
  body('numero_documento')
    .notEmpty()
    .withMessage('El número de documento es requerido')
    .matches(/^\d{8}$|^\d{11}$/)
    .withMessage('El documento debe ser un DNI (8 dígitos) o RUC (11 dígitos)'),
  body('direccion')
    .optional(),
  body('telefono')
    .notEmpty()
    .withMessage('El teléfono es requerido'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
];

// Obtener todos los clientes
router.get('/', async (req: Request, res: Response) => {
  try {
    const clientes = await Client.findAll({
      where: { estado: 'activo' },
      order: [['nombre', 'ASC']]
    });
    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ message: 'Error al obtener clientes' });
  }
});

// Obtener un cliente por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const cliente = await Client.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ message: 'Error al obtener cliente' });
  }
});

// Crear nuevo cliente
router.post('/', clientValidation, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Client.create({
      ...req.body,
      estado: 'activo'
    });
    res.status(201).json(cliente);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ message: 'Error al crear cliente' });
  }
});

// Actualizar cliente
router.put('/:id', clientValidation, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cliente = await Client.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    await cliente.update(req.body);
    res.json(cliente);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ message: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente (cambio de estado a inactivo)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const cliente = await Client.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    
    await cliente.update({ estado: 'inactivo' });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ message: 'Error al eliminar cliente' });
  }
});

export default router;
