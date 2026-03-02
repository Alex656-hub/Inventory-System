"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alertsController_1 = require("../controllers/alertsController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación
router.use(auth_middleware_1.verificarToken);
// Rutas accesibles por gerente y empleado
router.get('/', auth_middleware_1.gerenteOEmpleado, alertsController_1.getAlerts);
router.get('/recommendations', auth_middleware_1.gerenteOEmpleado, alertsController_1.getRecommendations);
// Rutas que requieren ser gerente (para ejecutar checks y resolver alertas)
router.post('/check', auth_middleware_1.soloGerente, alertsController_1.checkAlerts);
router.put('/:id/resolve', auth_middleware_1.soloGerente, alertsController_1.resolveAlert);
exports.default = router;
