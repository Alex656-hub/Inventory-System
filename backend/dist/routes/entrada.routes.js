"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const entrada_controller_1 = require("../controllers/entrada.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Rutas accesibles por gerente y empleado
router.get('/', auth_middleware_1.gerenteOEmpleado, entrada_controller_1.obtenerEntradas);
router.get('/:id', auth_middleware_1.gerenteOEmpleado, entrada_controller_1.obtenerEntradaPorId);
// Rutas que requieren ser gerente para crear/eliminar
router.post('/', auth_middleware_1.gerenteOEmpleado, entrada_controller_1.crearEntrada); // Empleados también pueden registrar compras
router.delete('/:id', auth_middleware_1.soloGerente, entrada_controller_1.eliminarEntrada);
exports.default = router;
