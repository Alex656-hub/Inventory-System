import { Op, fn, col } from 'sequelize';
import OperacionStock from '../../models/OperacionStock';
import Product from '../../models/Product';
import { subMonths, addMonths, format } from 'date-fns';

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

export const getFinancialProjections = async (months: number = 6): Promise<FinancialProjection[]> => {
  try {
    const twelveMonthsAgo = subMonths(new Date(), 12);

    const ventas = await OperacionStock.findAll({
      where: {
        tipo_operacion: 'SALIDA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: twelveMonthsAgo }
      },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('fecha_emision')), 'month'],
        [fn('SUM', col('costo_total')), 'total']
      ],
      group: [fn('DATE_TRUNC', 'month', col('fecha_emision'))],
      order: [[fn('DATE_TRUNC', 'month', col('fecha_emision')), 'ASC']],
      raw: true
    });

    const compras = await OperacionStock.findAll({
      where: {
        tipo_operacion: 'ENTRADA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: twelveMonthsAgo }
      },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('fecha_emision')), 'month'],
        [fn('SUM', col('costo_total')), 'total']
      ],
      group: [fn('DATE_TRUNC', 'month', col('fecha_emision'))],
      order: [[fn('DATE_TRUNC', 'month', col('fecha_emision')), 'ASC']],
      raw: true
    });

    const monthlyData: Record<string, { revenue: number; expenses: number }> = {};

    (ventas as any[]).forEach(v => {
      const month = format(new Date(v.month), 'yyyy-MM');
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0 };
      monthlyData[month].revenue += Number(v.total) || 0;
    });

    (compras as any[]).forEach(c => {
      const month = format(new Date(c.month), 'yyyy-MM');
      if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0 };
      monthlyData[month].expenses += Number(c.total) || 0;
    });

    const monthlyArray = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    if (monthlyArray.length === 0) {
      return Array.from({ length: months }, (_, i) => {
        const d = addMonths(new Date(), i + 1);
        return {
          date: format(d, 'yyyy-MM'),
          projectedRevenue: 0,
          projectedExpenses: 0,
          projectedProfit: 0,
          confidenceInterval: { lower: 0, upper: 0 }
        };
      });
    }

    const windowSize = Math.min(3, monthlyArray.length);
    const movingAverages: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];

    for (let i = windowSize - 1; i < monthlyArray.length; i++) {
      const window = monthlyArray.slice(i - windowSize + 1, i + 1);
      movingAverages.push({
        month: window[window.length - 1].month,
        revenue: window.reduce((s, item) => s + item.revenue, 0) / windowSize,
        expenses: window.reduce((s, item) => s + item.expenses, 0) / windowSize,
        profit: window.reduce((s, item) => s + item.profit, 0) / windowSize
      });
    }

    const lastMonth = monthlyArray[monthlyArray.length - 1];
    const lastDate = new Date(lastMonth.month + '-01');

    const trend = movingAverages.length > 1
      ? (movingAverages[movingAverages.length - 1].revenue - movingAverages[movingAverages.length - 2].revenue) / 3
      : 0;

    const expenseTrend = movingAverages.length > 1
      ? (movingAverages[movingAverages.length - 1].expenses - movingAverages[movingAverages.length - 2].expenses) / 3
      : 0;

    const projections: FinancialProjection[] = [];

    for (let i = 1; i <= months; i++) {
      const projectionDate = addMonths(lastDate, i);
      const monthStr = format(projectionDate, 'yyyy-MM');

      const projectedRevenue = Math.max(0, lastMonth.revenue + (trend * i));
      const projectedExpenses = Math.max(0, lastMonth.expenses + (expenseTrend * i));
      const projectedProfit = projectedRevenue - projectedExpenses;

      const stdDev = Math.sqrt(Math.abs(projectedRevenue) * 0.15 + 1);

      projections.push({
        date: monthStr,
        projectedRevenue: parseFloat(projectedRevenue.toFixed(2)),
        projectedExpenses: parseFloat(projectedExpenses.toFixed(2)),
        projectedProfit: parseFloat(projectedProfit.toFixed(2)),
        confidenceInterval: {
          lower: Math.max(0, projectedRevenue - (1.96 * stdDev)),
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

export const calculateBreakEvenPoint = async (): Promise<{
  breakEvenUnits: number;
  fixedCosts: number;
  averagePrice: number;
  variableCostPerUnit: number;
}> => {
  try {
    const lastMonth = subMonths(new Date(), 1);
    const inicioMes = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const finMes = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const fixedCostsResult = await OperacionStock.sum('costo_total', {
      where: {
        tipo_operacion: 'ENTRADA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: inicioMes, [Op.lte]: finMes }
      }
    });
    const fixedCosts = Number(fixedCostsResult) || 10000;

    const products = await Product.findAll({
      attributes: ['precio_venta', 'precio_compra'],
      where: {
        precio_venta: { [Op.gt]: 0 },
        precio_compra: { [Op.gt]: 0 }
      },
      raw: true
    });

    if (products.length === 0) {
      return {
        breakEvenUnits: 0,
        fixedCosts,
        averagePrice: 0,
        variableCostPerUnit: 0
      };
    }

    const avgPrice = products.reduce((sum, p) => sum + (Number(p.precio_venta) || 0), 0) / products.length;
    const avgCost = products.reduce((sum, p) => sum + (Number(p.precio_compra) || 0), 0) / products.length;

    const margin = avgPrice - avgCost;
    const breakEvenUnits = margin > 0 ? Math.ceil(fixedCosts / margin) : 0;

    return {
      breakEvenUnits,
      fixedCosts,
      averagePrice: parseFloat(avgPrice.toFixed(2)),
      variableCostPerUnit: parseFloat(avgCost.toFixed(2))
    };
  } catch (error) {
    console.error('Error al calcular el punto de equilibrio:', error);
    throw new Error('No se pudo calcular el punto de equilibrio');
  }
};
