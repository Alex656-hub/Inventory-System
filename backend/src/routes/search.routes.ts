import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller';
import { verificarToken, gerenteOEmpleado } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Ruta de búsqueda global, accesible por gerente y empleado
router.get('/global', gerenteOEmpleado, globalSearch);

export default router;
