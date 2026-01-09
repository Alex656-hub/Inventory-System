"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const movimiento_controller_1 = require("../controllers/movimiento.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
router.get('/', auth_middleware_1.gerenteOEmpleado, movimiento_controller_1.obtenerMovimientos);
router.get('/kardex/:id', auth_middleware_1.gerenteOEmpleado, movimiento_controller_1.obtenerKardexPorProducto);
exports.default = router;
