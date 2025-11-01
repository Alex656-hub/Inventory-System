"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supplier_controller_1 = require("../controllers/supplier.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Rutas accesibles por gerente y empleado
router.get('/', auth_middleware_1.gerenteOEmpleado, supplier_controller_1.obtenerProveedores);
router.get('/:id', auth_middleware_1.gerenteOEmpleado, supplier_controller_1.obtenerProveedorPorId);
// Rutas que requieren ser gerente
router.post('/', auth_middleware_1.soloGerente, supplier_controller_1.crearProveedor);
router.put('/:id', auth_middleware_1.soloGerente, supplier_controller_1.actualizarProveedor);
router.delete('/:id', auth_middleware_1.soloGerente, supplier_controller_1.eliminarProveedor);
exports.default = router;
