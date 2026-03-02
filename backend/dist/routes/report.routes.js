"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/report.routes.ts
const express_1 = require("express");
const ReportController_1 = require("../controllers/ReportController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Todas las rutas requieren autenticación y ser gerente
router.use(auth_middleware_1.verificarToken);
router.use(auth_middleware_1.soloGerente);
router.post('/generate', ReportController_1.generateReport);
exports.default = router;
