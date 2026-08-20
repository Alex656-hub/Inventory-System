import { Request, Response } from 'express';
import { advancedDemandForecasting } from '../analytics/services/advancedDemandForecasting';
import { getInventoryMetrics as getInventoryMetricsService } from '../analytics/services/inventoryAnalysis';
import { getFinancialProjections } from '../analytics/services/financialProjections';
import { CuotaPago } from '../models';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Controlador para las rutas de análisis predictivo
 */

/**
 * Obtiene métricas clave de inventario
 */
/**
 * Obtiene un pronóstico avanzado de demanda basado en un modelo estadístico
 * de regresión con estacionalidad (implementado en TypeScript)
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
 * Obtiene la elegibilidad de pronóstico por producto (días de historia desde la primera venta)
 */
export const forecastEligibility = async (req: Request, res: Response) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT t.producto_id, MIN(t.fecha) AS "primeraVenta"
       FROM (
         SELECT d.producto_id, s.fecha
         FROM detalle_salidas d
         INNER JOIN salidas_inventario s ON s.id = d.salida_id
         WHERE s.estado = 'completado'
           AND s.fecha >= now() - interval '24 months'
         UNION ALL
         SELECT det.producto_id, op.fecha_emision
         FROM detalles_operacion det
         INNER JOIN operaciones_stock op ON op.id = det.operacion_id
         WHERE op.tipo_operacion = 'SALIDA'
           AND op.estado = 'PROCESADO'
           AND op.fecha_emision >= now() - interval '24 months'
       ) t
       GROUP BY t.producto_id`
    );

    const hoy = Date.now();
    const data = (rows as Array<{ producto_id: number; primeraVenta: Date | string }>).map(r => {
      const primera = r.primeraVenta instanceof Date ? r.primeraVenta : new Date(r.primeraVenta);
      const dias = Math.max(1, Math.floor((hoy - primera.getTime()) / 86400000) + 1);
      return { productId: Number(r.producto_id), dias };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en forecastEligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la elegibilidad del pronóstico'
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
