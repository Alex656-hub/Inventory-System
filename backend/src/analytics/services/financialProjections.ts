import { Op, fn, col } from 'sequelize';
import OperacionStock from '../../models/OperacionStock';
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


