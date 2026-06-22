import { Router } from 'express';
import multer from 'multer';
import backupController from '../controllers/backup.controller';
import { verificarToken, soloGerente } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/create', verificarToken, soloGerente, backupController.createBackup);
router.post('/restore', verificarToken, soloGerente, upload.single('file'), backupController.restoreBackup);

export default router;
