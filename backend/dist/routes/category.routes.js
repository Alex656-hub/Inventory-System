"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Rutas accesibles por gerente y empleado
router.get('/', auth_middleware_1.gerenteOEmpleado, category_controller_1.obtenerCategorias);
router.get('/:id', auth_middleware_1.gerenteOEmpleado, category_controller_1.obtenerCategoriaPorId);
// Rutas que requieren ser gerente
router.post('/', auth_middleware_1.soloGerente, category_controller_1.crearCategoria);
router.put('/:id', auth_middleware_1.soloGerente, category_controller_1.actualizarCategoria);
router.delete('/:id', auth_middleware_1.soloGerente, category_controller_1.eliminarCategoria);
exports.default = router;
