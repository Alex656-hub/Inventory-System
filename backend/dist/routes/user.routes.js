"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación y solo el gerente puede acceder
router.use(auth_middleware_1.verificarToken);
router.use(auth_middleware_1.soloGerente);
router.get('/', user_controller_1.obtenerUsuarios);
router.get('/:id', user_controller_1.obtenerUsuarioPorId);
router.post('/', user_controller_1.crearUsuario);
router.put('/:id', user_controller_1.actualizarUsuario);
router.delete('/:id', user_controller_1.eliminarUsuario);
exports.default = router;
