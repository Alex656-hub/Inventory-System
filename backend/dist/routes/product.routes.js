"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Rutas accesibles por gerente y empleado
router.get('/', auth_middleware_1.gerenteOEmpleado, product_controller_1.obtenerProductos);
router.get('/stock-bajo', auth_middleware_1.gerenteOEmpleado, product_controller_1.obtenerProductosStockBajo);
router.get('/:id', auth_middleware_1.gerenteOEmpleado, product_controller_1.obtenerProductoPorId);
// Rutas que requieren ser gerente
router.post('/', auth_middleware_1.soloGerente, product_controller_1.crearProducto);
router.put('/:id', auth_middleware_1.soloGerente, product_controller_1.actualizarProducto);
router.delete('/:id', auth_middleware_1.soloGerente, product_controller_1.eliminarProducto);
exports.default = router;
