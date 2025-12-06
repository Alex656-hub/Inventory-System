import { Op } from 'sequelize';
import { SalidaInventario, EntradaInventario, Product } from '../../models';
import ProductModel from '../../models/Product';
import { subMonths, addMonths, format } from 'date-fns';

/**
 * Servicio para proyecciones financieras
 */

export interface FinancialProjection {
  date: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Obtiene proyecciones financieras para los próximos meses
 */
export const getFinancialProjections = async (months: number = 6): Promise<FinancialProjection[]> => {
  try {
    // Obtener datos históricos de los últimos 12 meses
    const twelveMonthsAgo = subMonths(new Date(), 12);
    
    // Obtener ventas de los últimos 12 meses
    const sales = await SalidaInventario.findAll({
      where: {
        fecha: {
          [Op.gte]: twelveMonthsAgo,
          [Op.lte]: new Date()
        },
        estado: 'completado'
      },
      attributes: ['fecha', 'total'],
      order: [['fecha', 'ASC']]
    });

    // Obtener gastos de los últimos 12 meses
    const expenses = await EntradaInventario.findAll({
      where: {
        fecha: {
          [Op.gte]: twelveMonthsAgo,
          [Op.lte]: new Date()
        }
      },
      attributes: ['fecha', 'total'],
      order: [['fecha', 'ASC']]
    });

    // Agrupar por mes
    const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
    
    // Procesar ventas
    sales.forEach(sale => {
      const month = format(sale.fecha, 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0 };
      }
      monthlyData[month].revenue += parseFloat(sale.total.toString());
    });

    // Procesar gastos
    expenses.forEach(expense => {
      const month = format(expense.fecha, 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0 };
      }
      monthlyData[month].expenses += parseFloat(expense.total.toString());
    });

    // Calcular promedios móviles
    const monthlyArray = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calcular promedios móviles de 3 meses
    const windowSize = 3;
    const movingAverages = [];
    
    for (let i = windowSize - 1; i < monthlyArray.length; i++) {
      const window = monthlyArray.slice(i - windowSize + 1, i + 1);
      const avgRevenue = window.reduce((sum, item) => sum + item.revenue, 0) / windowSize;
      const avgExpenses = window.reduce((sum, item) => sum + item.expenses, 0) / windowSize;
      const avgProfit = window.reduce((sum, item) => sum + item.profit, 0) / windowSize;
      
      movingAverages.push({
        month: window[window.length - 1].month,
        revenue: avgRevenue,
        expenses: avgExpenses,
        profit: avgProfit
      });
    }

    // Generar proyecciones
    const projections: FinancialProjection[] = [];
    const lastMonth = monthlyArray[monthlyArray.length - 1];
    const lastDate = new Date(lastMonth.month + '-01');
    
    // Usar la tendencia de los últimos 3 meses para la proyección
    const trend = movingAverages.length > 1 
      ? (movingAverages[movingAverages.length - 1].revenue - movingAverages[movingAverages.length - 2].revenue) / 3
      : 0;

    for (let i = 1; i <= months; i++) {
      const projectionDate = addMonths(lastDate, i);
      const monthStr = format(projectionDate, 'yyyy-MM');
      
      // Calcular proyección con tendencia
      const projectedRevenue = Math.max(0, lastMonth.revenue + (trend * i));
      const projectedExpenses = lastMonth.expenses * (1 + (0.02 * i)); // Asumiendo un 2% de incremento mensual en gastos
      const projectedProfit = projectedRevenue - projectedExpenses;
      
      // Calcular intervalo de confianza (simplificado)
      const stdDev = Math.sqrt(projectedRevenue * 0.15); // 15% de desviación estándar
      
      projections.push({
        date: monthStr,
        projectedRevenue: parseFloat(projectedRevenue.toFixed(2)),
        projectedExpenses: parseFloat(projectedExpenses.toFixed(2)),
        projectedProfit: parseFloat(projectedProfit.toFixed(2)),
        confidenceInterval: {
          lower: Math.max(0, projectedRevenue - (1.96 * stdDev)), // 95% de confianza
          upper: projectedRevenue + (1.96 * stdDev)
        }
      });
    }

    return projections;
  } catch (error) {
    console.error('Error al generar proyecciones financieras:', error);
    throw new Error('No se pudieron generar las proyecciones financieras');
  }
};

/**
 * Calcula el punto de equilibrio basado en costos fijos y márgenes
 */
export const calculateBreakEvenPoint = async (): Promise<{
  breakEvenUnits: number;
  fixedCosts: number;
  averagePrice: number;
  variableCostPerUnit: number;
}> => {
  try {
    // Obtener costos fijos (simplificado: gastos del último mes)
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM-01');
    const currentMonth = format(new Date(), 'yyyy-MM-01');
    
    const fixedCosts = await EntradaInventario.sum('total', {
      where: {
        fecha: {
          [Op.gte]: lastMonth,
          [Op.lt]: currentMonth
        }
      }
    }) || 10000; // Valor por defecto si no hay datos

    // Obtener precio promedio y costo variable por unidad
    const products = await Product.findAll({
      attributes: ['precio_venta', 'precio_compra']
    });

    interface ProductData {
      precio_venta: number | null;
      precio_compra: number | null;
      [key: string]: any;
    }

    const totalPrice = products.reduce((sum: number, p: ProductData) => sum + (p.precio_venta || 0), 0);
    const totalCost = products.reduce((sum: number, p: ProductData) => sum + (p.precio_compra || 0), 0);
    
    const averagePrice = totalPrice / (products.length || 1);
    const averageVariableCost = totalCost / (products.length || 1);
    
    // Calcular punto de equilibrio en unidades
    const breakEvenUnits = fixedCosts / (averagePrice - averageVariableCost);

    return {
      breakEvenUnits: Math.ceil(breakEvenUnits),
      fixedCosts,
      averagePrice: parseFloat(averagePrice.toFixed(2)),
      variableCostPerUnit: parseFloat(averageVariableCost.toFixed(2))
    };
  } catch (error) {
    console.error('Error al calcular el punto de equilibrio:', error);
    throw new Error('No se pudo calcular el punto de equilibrio');
  }
};
