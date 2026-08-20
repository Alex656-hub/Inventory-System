import { Op } from 'sequelize';
import { format, subMonths, addDays } from 'date-fns';
import { DetalleSalida, SalidaInventario, DetalleOperacion, OperacionStock } from '../../models';
import { cacheService } from '../../services/cache.service';
import * as cron from 'node-cron';

interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface HistoricalPoint {
  date: string;
  quantity: number;
}

interface ForecastResult {
  forecast: ForecastPoint[];
  historicalData: HistoricalPoint[];
  mape: number;
  seasonality: {
    weekly: number[];
    monthly: number[];
  };
  cached?: boolean;
  lastTrained?: string;
  trainingDays?: number;
  trainingWeeks?: number;
  trainingSales?: number;
}

interface ModelPoint {
  date: Date;
  y: number;
  t: number;
  month: number;
  resid: number;
}

// Las fechas DATEONLY llegan como medianoche UTC; se formatea con componentes UTC
// para preservar el día calendario sin importar la zona horaria del servidor.
const toDateKey = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Fecha (lunes) de la semana que contiene la fecha dada, en UTC.
const toWeekStartKey = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  const monday = new Date(Date.UTC(y, m, d - ((dow + 6) % 7)));
  return toDateKey(monday);
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

export class AdvancedDemandForecasting {
  private async getHistoricalData(productId: number, months: number = 24): Promise<Array<{ds: string, y: number}>> {
    const endDate = new Date();
    const startDate = subMonths(endDate, months);
    
    const sales = await SalidaInventario.findAll({
      where: {
        fecha: { [Op.between]: [startDate, endDate] },
        estado: 'completado'
      },
      include: [{
        model: DetalleSalida,
        as: 'detalles',
        where: { producto_id: productId },
        required: true
      }],
      order: [['fecha', 'ASC']],
      raw: true,
      nest: true
    });

    const dailySales: Record<string, number> = {};
    sales.forEach((sale: any) => {
      const dateStr = toDateKey(new Date(sale.fecha));
      const detalles = Array.isArray(sale.detalles) ? sale.detalles : [sale.detalles];
      const cantidadTotal = detalles.reduce((sum: number, detalle: any) => sum + (detalle.cantidad || 0), 0);
      dailySales[dateStr] = (dailySales[dateStr] || 0) + cantidadTotal;
    });

    // Ventas registradas por Operaciones de Stock (SALIDA procesada)
    const operaciones = await OperacionStock.findAll({
      where: {
        tipo_operacion: 'SALIDA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.between]: [startDate, endDate] }
      },
      include: [{
        model: DetalleOperacion,
        as: 'detalles',
        where: { producto_id: productId },
        required: true
      }],
      order: [['fecha_emision', 'ASC']],
      raw: true,
      nest: true
    });

    operaciones.forEach((op: any) => {
      const dateStr = toDateKey(new Date(op.fecha_emision));
      const detalles = Array.isArray(op.detalles) ? op.detalles : [op.detalles];
      const cantidadTotal = detalles.reduce((sum: number, detalle: any) => sum + (detalle.cantidad || 0), 0);
      dailySales[dateStr] = (dailySales[dateStr] || 0) + cantidadTotal;
    });

    const dates = Object.keys(dailySales).sort();
    if (dates.length === 0) {
      return [];
    }

    // Agregar ventas diarias por semana (lunes como etiqueta de cada semana)
    const weeklySales: Record<string, number> = {};
    dates.forEach(dateKey => {
      const weekKey = toWeekStartKey(new Date(dateKey + 'T00:00:00Z'));
      weeklySales[weekKey] = (weeklySales[weekKey] || 0) + (dailySales[dateKey] || 0);
    });

    const weekKeys = Object.keys(weeklySales).sort();
    const firstWeek = new Date(weekKeys[0] + 'T00:00:00Z');
    const now = new Date();
    const currentWeek = new Date(toWeekStartKey(now) + 'T00:00:00Z');

    // Serie semanal continua desde la semana de la primera venta hasta la semana actual
    const series: Array<{ds: string, y: number}> = [];
    const cursor = new Date(firstWeek);
    while (cursor <= currentWeek) {
      const key = toDateKey(cursor);
      series.push({ ds: key, y: weeklySales[key] || 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return series;
  }

  private getFromCache(key: string): ForecastResult | null {
    try {
      return cacheService.getRaw<ForecastResult>(key) || null;
    } catch (error) {
      console.error('Error al leer de caché:', error);
      return null;
    }
  }

  private saveToCache(key: string, data: ForecastResult): void {
    try {
      cacheService.set(key, data);
    } catch (error) {
      console.error('Error al guardar en caché:', error);
    }
  }

  public async clearCache(keys?: string | string[]): Promise<void> {
    if (keys) {
      cacheService.del(Array.isArray(keys) ? keys : [keys]);
    } else {
      cacheService.flush();
    }
  }

  // Invalida el caché de los horizontes de pronóstico de los productos afectados
  public invalidateForProducts(productIds: number[]): void {
    const keys: string[] = [];
    const horizons = [30, 60, 90];
    productIds.forEach(pid => {
      horizons.forEach(d => keys.push(`forecast_v4_${pid}_${d}`));
    });
    if (keys.length === 0) return;
    try {
      cacheService.del(keys);
      console.log(`[DemandForecasting] Caché invalidada para ${productIds.length} producto(s)`);
    } catch (error) {
      console.error('Error al invalidar caché de pronóstico:', error);
    }
  }

  public scheduleRetraining(cronExpression: string = '0 3 * * 0'): void {
    cron.schedule(cronExpression, async () => {
      console.log('Iniciando reentrenamiento programado de modelos...');
      try {
        await this.clearCache();
        console.log('Reentrenamiento completado');
      } catch (error) {
        console.error('Error en el reentrenamiento programado:', error);
      }
    });
  }

  public async getAdvancedForecast(
    productId: number, 
    days: number = 30,
    forceRetrain: boolean = false
  ): Promise<ForecastResult> {
    try {
      const cacheKey = `forecast_v4_${productId}_${days}`;
      
      if (!forceRetrain) {
        const cachedResult = await this.getFromCache(cacheKey);
        if (cachedResult) {
          return { ...cachedResult, cached: true };
        }
      }

      const historical = await this.getHistoricalData(productId);

      const minWeeks = 4;
      if (historical.length < minWeeks) {
        throw new Error(`Se requieren al menos ${minWeeks} semanas de datos históricos; este producto tiene ${historical.length} semanas`);
      }
      
      const forecastData = this.forecastWithSeasonalTrend(historical, days);
      
      const result: ForecastResult = {
        ...forecastData,
        historicalData: historical.map(h => ({ date: h.ds, quantity: h.y })),
        cached: false,
        lastTrained: new Date().toISOString(),
        trainingWeeks: historical.length,
        trainingDays: historical.length * 7,
        trainingSales: historical.reduce((sum, h) => sum + h.y, 0)
      };
      
      await this.saveToCache(cacheKey, result);
      
      return result;
      
    } catch (error: any) {
      console.error('Error en el pronóstico avanzado:', error);
      throw new Error(`Error al generar el pronóstico de demanda: ${error.message}`);
    }
  }

  /**
   * Modelo estadístico en TypeScript puro para series semanales dispersas:
   * media semanal global × factor de estacionalidad mensual (multiplicativo).
   * Pronostica unidades por semana con 2 decimales; los intervalos usan la
   * desviación estándar de los residuales (±1.96*SE). Al basarse en la media
   * global (no en una regresión sobre cola de ceros), el pronóstico es no-cero
   * siempre que el producto tenga al menos una venta en la ventana.
   */
  private forecastWithSeasonalTrend(
    data: Array<{ ds: string, y: number }>,
    days: number
  ): Omit<ForecastResult, 'historicalData' | 'cached' | 'lastTrained'> {
    const sorted = [...data].sort((a, b) => a.ds.localeCompare(b.ds));

    const points: ModelPoint[] = sorted.map((item, index) => {
      const date = new Date(item.ds + 'T00:00:00');
      return {
        date,
        y: item.y,
        t: index,
        month: date.getMonth(),
        resid: 0
      };
    });

    const n = points.length;
    const totalSales = points.reduce((s, p) => s + p.y, 0);
    const weeklyMean = n > 0 ? totalSales / n : 0;

    // Factores mensuales multiplicativos relativos a la media semanal global
    const monthSums = new Array<number>(12).fill(0);
    const monthCounts = new Array<number>(12).fill(0);
    points.forEach(p => {
      monthSums[p.month] += p.y;
      monthCounts[p.month] += 1;
    });
    const monthlyFactor = monthSums.map((sum, i) => {
      if (monthCounts[i] === 0) return 1;
      const avg = sum / monthCounts[i];
      return weeklyMean > 0 ? Math.max(0.1, Math.min(4, avg / weeklyMean)) : 1;
    });

    // Ajuste y residuales
    const fitted = (p: ModelPoint) => weeklyMean * monthlyFactor[p.month];
    points.forEach(p => {
      p.resid = p.y - fitted(p);
    });
    const sigma = Math.sqrt(
      points.reduce((s, p) => s + p.resid ** 2, 0) / (n - 1 || 1)
    );

    // MAPE (error porcentual absoluto medio) sobre el ajuste
    const nonZero = points.filter(p => p.y > 0);
    const mape = nonZero.length > 0
      ? Math.round((nonZero.reduce((s, p) => s + (Math.abs(p.resid) / p.y), 0) / nonZero.length) * 10000) / 100
      : 0;

    // Pronóstico para las próximas `weeks` semanas (30 días ≈ 5 semanas)
    const weeks = Math.max(1, Math.ceil(days / 7));
    const lastPoint = points[n - 1];
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= weeks; i++) {
      const date = addDays(lastPoint.date, i * 7);
      const predicted = weeklyMean * monthlyFactor[date.getMonth()];

      const se = sigma * Math.sqrt(1 + (1 / n));
      forecast.push({
        date: format(date, 'yyyy-MM-dd'),
        predicted: Math.max(0, round2(predicted)),
        lower: Math.max(0, round2(predicted - 1.96 * se)),
        upper: Math.max(0, round2(predicted + 1.96 * se))
      });
    }

    return {
      forecast,
      mape,
      seasonality: {
        weekly: [1, 1, 1, 1, 1, 1, 1],
        monthly: monthlyFactor
      }
    };
  }
}

export const advancedDemandForecasting = new AdvancedDemandForecasting();

if (process.env.NODE_ENV === 'production') {
  advancedDemandForecasting.scheduleRetraining();
}