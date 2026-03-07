import { Router } from 'express';
import {
  obtenerCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  eliminarCategoriaHard
} from '../controllers/category.controller';
import { verificarToken, gerenteOEmpleado, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas accesibles por gerente y empleado
router.get('/', gerenteOEmpleado, obtenerCategorias);
router.get('/:id', gerenteOEmpleado, obtenerCategoriaPorId);

// Rutas que requieren ser gerente
router.post('/', soloGerente, crearCategoria);
router.put('/:id', soloGerente, actualizarCategoria);
router.delete('/:id', soloGerente, eliminarCategoria);
router.delete('/hard/:id', soloGerente, eliminarCategoriaHard);

export default router;

