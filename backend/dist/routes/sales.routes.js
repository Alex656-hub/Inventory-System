"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salesController_1 = __importDefault(require("../controllers/salesController"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Importar ventas - requiere ser gerente
router.post('/import', auth_middleware_1.verificarToken, auth_middleware_1.soloGerente, ...salesController_1.default.uploadSales);
// Listar ventas - gerente o empleado
router.get('/', auth_middleware_1.verificarToken, auth_middleware_1.gerenteOEmpleado, salesController_1.default.getSales);
// Resumen ventas - gerente o empleado  
router.get('/summary', auth_middleware_1.verificarToken, auth_middleware_1.gerenteOEmpleado, salesController_1.default.getSalesSummary);
exports.default = router;
