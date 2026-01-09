"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryMetrics = exports.advancedForecastDemand = exports.forecastDemand = void 0;
const demandForecasting_1 = require("../analytics/services/demandForecasting");
const advancedDemandForecasting_1 = require("../analytics/services/advancedDemandForecasting");
const inventoryAnalysis_1 = require("../analytics/services/inventoryAnalysis");
/**
 * Controlador para las rutas de análisis predictivo
 */
const forecastDemand = async (req, res) => {
    try {
        const { productId, categoryId, monthsToForecast, confidenceLevel } = req.query;
        // Validar y convertir parámetros
        const options = {};
        if (productId)
            options.productId = parseInt(productId, 10);
        if (categoryId)
            options.categoryId = parseInt(categoryId, 10);
        if (monthsToForecast)
            options.monthsToForecast = parseInt(monthsToForecast, 10);
        if (confidenceLevel)
            options.confidenceLevel = parseFloat(confidenceLevel);
        // Validar que al menos uno de los filtros esté presente
        if (!options.productId && !options.categoryId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere al menos un ID de producto o categoría'
            });
        }
        // Obtener pronóstico
        const result = await (0, demandForecasting_1.getDemandForecast)(options);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
                details: result.details
            });
        }
        // Formatear respuesta
        const response = {
            success: true,
            data: {
                forecast: result.forecast,
                confidence: result.confidence,
                historicalData: result.historicalData
            },
            metadata: {
                productId: options.productId,
                categoryId: options.categoryId,
                forecastPeriod: options.monthsToForecast || 3,
                generatedAt: new Date().toISOString()
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error en el controlador de pronóstico:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.forecastDemand = forecastDemand;
/**
 * Obtiene métricas clave de inventario
 */
/**
 * Obtiene un pronóstico avanzado de demanda utilizando Prophet
 */
const advancedForecastDemand = async (req, res) => {
    try {
        const { productId, days = '30' } = req.query;
        // Validar parámetros
        if (!productId) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere el ID del producto'
            });
        }
        const productIdNum = parseInt(productId, 10);
        const daysNum = parseInt(days, 10);
        if (isNaN(productIdNum) || isNaN(daysNum) || daysNum <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros inválidos'
            });
        }
        // Obtener pronóstico avanzado
        const result = await advancedDemandForecasting_1.advancedDemandForecasting.getAdvancedForecast(productIdNum, daysNum);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error en advancedForecastDemand:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar el pronóstico avanzado',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.advancedForecastDemand = advancedForecastDemand;
/**
 * Obtiene métricas clave de inventario con indicadores financieros
 */
const getInventoryMetrics = async (req, res) => {
    try {
        const metrics = await (0, inventoryAnalysis_1.getInventoryMetrics)();
        res.json({
            success: true,
            data: {
                summary: {
                    totalProducts: metrics.totalProducts,
                    totalValue: metrics.totalInventoryValue,
                    lastUpdated: metrics.lastUpdated
                },
                stock: {
                    lowStockItems: metrics.lowStockItems,
                    outOfStockItems: metrics.outOfStockItems,
                    stockoutRate: metrics.stockoutRate,
                    slowMovingItems: metrics.slowMovingItems
                },
                financial: {
                    inventoryTurnover: metrics.inventoryTurnover,
                    daysSalesOfInventory: metrics.daysSalesOfInventory,
                    grossMargin: metrics.grossMargin,
                    carryingCost: metrics.carryingCost,
                    averageStockValue: metrics.averageStockValue
                }
            }
        });
    }
    catch (error) {
        console.error('Error al obtener métricas de inventario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener métricas de inventario',
            details: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.getInventoryMetrics = getInventoryMetrics;
