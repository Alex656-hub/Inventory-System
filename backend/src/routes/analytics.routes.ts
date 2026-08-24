import { Router } from 'express';
import { getInventoryMetrics, advancedForecastDemand, forecastEligibility, getFinancialProjectionsController, getAging } from '../controllers/analyticsController';
import { verificarToken, verificarRol, verificarPermiso } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Análisis predictivo y métricas de inventario
 */

/**
 * @swagger
 * /api/analytics/advanced-forecast:
 *   get:
 *     summary: Obtiene un pronóstico avanzado de demanda (modelo estadístico en TypeScript)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del producto para el pronóstico
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de días a pronosticar (máx. 90)
 *     responses:
 *       200:
 *         description: Pronóstico generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdvancedForecast'
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error al generar el pronóstico
 */
router.get('/advanced-forecast', verificarToken, verificarPermiso('alertasStock'), advancedForecastDemand);
router.get('/forecast/eligibility', verificarToken, verificarPermiso('alertasStock'), forecastEligibility);

/**
 * @swagger
 * /api/analytics/metrics:
 *   get:
 *     summary: Obtiene métricas clave de inventario con indicadores financieros
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProducts:
 *                           type: integer
 *                           description: Número total de productos en inventario
 *                         totalValue:
 *                           type: number
 *                           format: float
 *                           description: Valor total del inventario
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                     stock:
 *                       type: object
 *                       properties:
 *                         lowStockItems:
 *                           type: integer
 *                         outOfStockItems:
 *                           type: integer
 *                         stockoutRate:
 *                           type: number
 *                           format: float
 *                         slowMovingItems:
 *                           type: integer
 *                     financial:
 *                       type: object
 *                       properties:
 *                         inventoryTurnover:
 *                           type: number
 *                           format: float
 *                         daysSalesOfInventory:
 *                           type: number
 *                           format: float
 *                         grossMargin:
 *                           type: number
 *                           format: float
 *                         carryingCost:
 *                           type: number
 *                           format: float
 *                         averageStockValue:
 *                           type: number
 *                           format: float
 *       401:
 *         description: No autorizado. Se requiere autenticación.
 *       500:
 *         description: Error del servidor al obtener las métricas
 */
router.get('/metrics', verificarToken, verificarPermiso('alertasStock'), getInventoryMetrics);

router.get('/projections', verificarToken, verificarPermiso('alertasStock'), getFinancialProjectionsController);

router.get('/aging', verificarToken, verificarPermiso('alertasStock'), getAging);

export default router;
