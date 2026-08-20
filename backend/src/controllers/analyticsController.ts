import { Request, Response } from 'express';
import { getDemandForecast, DemandForecastOptions } from '../analytics/services/demandForecasting';
import { advancedDemandForecasting } from '../analytics/services/advancedDemandForecasting';
import { getInventoryMetrics as getInventoryMetricsService, InventoryMetrics } from '../analytics/services/inventoryAnalysis';
import { getFinancialProjections, calculateBreakEvenPoint } from '../analytics/services/financialProjections';
import { CuotaPago } from '../models';
import { Op } from 'sequelize';
import { format } from 'date-fns';

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

export const getFinancialProjectionsController = async (req: Request, res: Response) => {
  try {
    const { months = '6' } = req.query;
    const monthsNum = parseInt(months as string, 10);

    if (isNaN(monthsNum) || monthsNum <= 0 || monthsNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Los meses deben ser un número entre 1 y 12'
      });
    }

    const projections = await getFinancialProjections(monthsNum);

    res.json({
      success: true,
      data: projections
    });
  } catch (error) {
    console.error('Error al obtener proyecciones financieras:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar proyecciones financieras',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getBreakEvenPointController = async (req: Request, res: Response) => {
  try {
    const breakEven = await calculateBreakEvenPoint();

    res.json({
      success: true,
      data: breakEven
    });
  } catch (error) {
    console.error('Error al calcular punto de equilibrio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al calcular punto de equilibrio',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const getAging = async (req: Request, res: Response) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cuotas = await CuotaPago.findAll({
      where: {
        estado: { [Op.in]: ['pendiente', 'atrasada'] },
      },
      attributes: ['monto_total', 'fecha_vencimiento'],
      raw: true,
    });

    const aging = {
      actual: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    for (const c of cuotas) {
      const venc = new Date(c.fecha_vencimiento);
      venc.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      const monto = Number(c.monto_total);

      if (diffDays <= 0) {
        aging.actual += monto;
      } else if (diffDays <= 30) {
        aging['1-30'] += monto;
      } else if (diffDays <= 60) {
        aging['31-60'] += monto;
      } else if (diffDays <= 90) {
        aging['61-90'] += monto;
      } else {
        aging['90+'] += monto;
      }
    }

    // Redondear a 2 decimales
    Object.keys(aging).forEach(k => {
      aging[k as keyof typeof aging] = Math.round(aging[k as keyof typeof aging] * 100) / 100;
    });

    res.json({
      success: true,
      data: aging
    });
  } catch (error) {
    console.error('Error al obtener aging:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener aging de cartera',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
