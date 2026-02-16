"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_1 = require("../controllers/search.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Ruta de búsqueda global, accesible por gerente y empleado
router.get('/global', auth_middleware_1.gerenteOEmpleado, search_controller_1.globalSearch);
exports.default = router;
