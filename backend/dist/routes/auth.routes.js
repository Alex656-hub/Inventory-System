"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
router.get('/perfil', auth_middleware_1.verificarToken, auth_controller_1.obtenerPerfil);
exports.default = router;
