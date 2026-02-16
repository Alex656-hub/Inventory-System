"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Rutas públicas
router.post('/login', auth_controller_1.login);
router.post('/refresh', auth_controller_1.refreshToken);
// Rutas protegidas
router.get('/perfil', auth_middleware_1.verificarToken, auth_controller_1.obtenerPerfil);
router.post('/logout', auth_middleware_1.verificarToken, auth_controller_1.logout);
router.post('/logout-all', auth_middleware_1.verificarToken, auth_controller_1.logoutAll);
// Rutas de mantenimiento (solo gerentes)
router.delete('/cleanup', auth_middleware_1.soloGerente, auth_controller_1.cleanupTokens);
exports.default = router;
