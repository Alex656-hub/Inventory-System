import { Router } from 'express';
import { 
  login, 
  obtenerPerfil, 
  refreshToken, 
  logout, 
  logoutAll, 
  cleanupTokens 
} from '../controllers/auth.controller';
import { verificarToken, soloGerente } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', login);
router.post('/refresh', refreshToken);

// Rutas protegidas
router.get('/perfil', verificarToken, obtenerPerfil);
router.post('/logout', verificarToken, logout);
router.post('/logout-all', verificarToken, logoutAll);

// Rutas de mantenimiento (solo gerentes)
router.delete('/cleanup', soloGerente, cleanupTokens);

export default router;

