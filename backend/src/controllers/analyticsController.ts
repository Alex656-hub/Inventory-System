import { Request, Response } from 'express';
import { getDemandForecast, DemandForecastOptions } from '../analytics/services/demandForecasting';
import { advancedDemandForecasting } from '../analytics/services/advancedDemandForecasting';
import { getInventoryMetrics as getInventoryMetricsService, InventoryMetrics } from '../analytics/services/inventoryAnalysis';

/**
 * Controlador para las rutas de análisis predictivo
 */

export const forecastDemand = async (req: Request, res: Response) => {
  try {
    const { productId, categoryId, monthsToForecast, confidenceLevel } = req.query;
    
    // Validar y convertir parámetros
    const options: DemandForecastOptions = {};
    
    if (productId) options.productId = parseInt(productId as string, 10);
    if (categoryId) options.categoryId = parseInt(categoryId as string, 10);
    if (monthsToForecast) options.monthsToForecast = parseInt(monthsToForecast as string, 10);
    if (confidenceLevel) options.confidenceLevel = parseFloat(confidenceLevel as string);

    // Validar que al menos uno de los filtros esté presente
    if (!options.productId && !options.categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere al menos un ID de producto o categoría'
      });
    }

    // Obtener pronóstico
    const result = await getDemandForecast(options);

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
  } catch (error) {
    console.error('Error en el controlador de pronóstico:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtiene métricas clave de inventario
 */
/**
 * Obtiene un pronóstico avanzado de demanda utilizando Prophet
 */
export const advancedForecastDemand = async (req: Request, res: Response) => {
  try {
    const { productId, days = '30' } = req.query;
    
    // Validar parámetros
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del producto'
      });
    }

    const productIdNum = parseInt(productId as string, 10);
    const daysNum = parseInt(days as string, 10);

    if (isNaN(productIdNum) || isNaN(daysNum) || daysNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros inválidos'
      });
    }

    // Obtener pronóstico avanzado
    const result = await advancedDemandForecasting.getAdvancedForecast(productIdNum, daysNum);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error en advancedForecastDemand:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el pronóstico avanzado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtiene métricas clave de inventario con indicadores financieros
 */
export const getInventoryMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await getInventoryMetricsService();
    
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
  } catch (error) {
    console.error('Error al obtener métricas de inventario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener métricas de inventario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
