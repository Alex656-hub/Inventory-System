"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salida_controller_1 = require("../controllers/salida.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Rutas accesibles por gerente y empleado
router.get('/', auth_middleware_1.gerenteOEmpleado, salida_controller_1.obtenerSalidas);
router.get('/:id', auth_middleware_1.gerenteOEmpleado, salida_controller_1.obtenerSalidaPorId);
router.post('/', auth_middleware_1.gerenteOEmpleado, salida_controller_1.crearSalida); // Empleados pueden registrar ventas
// Rutas que requieren ser gerente
router.delete('/:id', auth_middleware_1.soloGerente, salida_controller_1.eliminarSalida);
exports.default = router;
