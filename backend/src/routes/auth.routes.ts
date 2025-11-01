import { Router } from 'express';
import { login, obtenerPerfil } from '../controllers/auth.controller';
import { verificarToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/perfil', verificarToken, obtenerPerfil);

export default router;

