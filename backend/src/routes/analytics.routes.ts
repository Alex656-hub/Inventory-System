import { Router } from 'express';
import { forecastDemand, getInventoryMetrics, advancedForecastDemand, getFinancialProjectionsController, getBreakEvenPointController, getAging } from '../controllers/analyticsController';
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
router.get('/advanced-forecast', verificarToken, verificarRol(['gerente']), advancedForecastDemand);

/**
 * @swagger
 * /api/analytics/forecast:
 *   get:
 *     summary: Obtiene un pronóstico de demanda
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: ID del producto para el pronóstico
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: ID de la categoría para el pronóstico
 *       - in: query
 *         name: monthsToForecast
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Número de meses a pronosticar
 *       - in: query
 *         name: confidenceLevel
 *         schema:
 *           type: number
 *           format: float
 *           minimum: 0.5
 *           maximum: 0.99
 *           default: 0.95
 *         description: Nivel de confianza del pronóstico (0.5-0.99)
 *     responses:
 *       200:
 *         description: Pronóstico generado exitosamente
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/forecast', verificarToken, verificarRol(['gerente']), forecastDemand);

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
router.get('/metrics', verificarToken, verificarRol(['gerente']), getInventoryMetrics);

router.get('/projections', verificarToken, verificarRol(['gerente']), getFinancialProjectionsController);

router.get('/break-even', verificarToken, verificarRol(['gerente']), getBreakEvenPointController);

router.get('/aging', verificarToken, verificarPermiso('alertasStock'), getAging);

export default router;
