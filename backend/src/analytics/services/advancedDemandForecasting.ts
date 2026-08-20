import { Op } from 'sequelize';
import { format, subMonths, addDays } from 'date-fns';
import { DetalleSalida, SalidaInventario } from '../../models';
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
}

interface ModelPoint {
  date: Date;
  y: number;
  t: number;
  dow: number;
  resid: number;
}

export class AdvancedDemandForecasting {
  private async getHistoricalData(productId: number, months: number = 12): Promise<Array<{ds: string, y: number}>> {
    const endDate = new Date();
    const startDate = subMonths(endDate, months);
    
    const sales = await SalidaInventario.findAll({
      where: {
        fecha: { [Op.between]: [startDate, endDate] },
        estado: 'completado'
      },
      include: [{
        model: DetalleSalida,
        where: { producto_id: productId },
        required: true
      }],
      order: [['fecha', 'ASC']],
      raw: true,
      nest: true
    });

    const dailySales = sales.reduce((acc: Record<string, number>, sale: any) => {
      const dateStr = format(new Date(sale.fecha), 'yyyy-MM-dd');
      if (!acc[dateStr]) {
        acc[dateStr] = 0;
      }
      const detalles = Array.isArray(sale.DetalleSalidas) ? sale.DetalleSalidas : [sale.DetalleSalidas];
      const cantidadTotal = detalles.reduce((sum: number, detalle: any) => sum + (detalle.cantidad || 0), 0);
      acc[dateStr] += cantidadTotal;
      return acc;
    }, {});

    return Object.entries(dailySales).map(([date, quantity]) => ({
      ds: date,
      y: quantity as number
    }));
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
      const cacheKey = `forecast_v2_${productId}_${days}`;
      
      if (!forceRetrain) {
        const cachedResult = await this.getFromCache(cacheKey);
        if (cachedResult) {
          return { ...cachedResult, cached: true };
        }
      }

      const historical = await this.getHistoricalData(productId);
      
      if (historical.length < 30) {
        throw new Error('Se requieren al menos 30 días de datos históricos');
      }
      
      const forecastData = this.forecastWithSeasonalTrend(historical, days);
      
      const result: ForecastResult = {
        ...forecastData,
        historicalData: historical.map(h => ({ date: h.ds, quantity: h.y })),
        cached: false,
        lastTrained: new Date().toISOString()
      };
      
      await this.saveToCache(cacheKey, result);
      
      return result;
      
    } catch (error: any) {
      console.error('Error en el pronóstico avanzado:', error);
      throw new Error(`Error al generar el pronóstico de demanda: ${error.message}`);
    }
  }

  /**
   * Modelo estadístico en TypeScript puro:
   * tendencia lineal (regresión por mínimos cuadrados) + estacionalidad semanal aditiva.
   * Los intervalos de confianza usan el intervalo de predicción de la regresión (±1.96*SE).
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
        dow: date.getDay(),
        resid: 0
      };
    });

    const n = points.length;
    const overallMean = points.reduce((s, p) => s + p.y, 0) / n;

    // Factores de estacionalidad semanal (media por día de la semana, como desvío de la base)
    const dowSums = new Array<number>(7).fill(0);
    const dowCounts = new Array<number>(7).fill(0);
    points.forEach(p => {
      dowSums[p.dow] += p.y;
      dowCounts[p.dow] += 1;
    });
    const dowMeans = dowSums.map((sum, i) => (dowCounts[i] > 0 ? sum / dowCounts[i] : 0));
    const dowWithData = dowMeans.filter(m => m > 0);
    const base = dowWithData.length > 0
      ? dowWithData.reduce((s, m) => s + m, 0) / dowWithData.length
      : overallMean;
    const seasonalOffset = dowMeans.map(m => m - base);

    // Desestacionalizar y ajustar regresión lineal y = b0 + b1 * t
    const deseasonalized = points.map(p => p.y - seasonalOffset[p.dow]);
    const tMean = points.reduce((s, p) => s + p.t, 0) / n;
    const yMean = deseasonalized.reduce((s, y) => s + y, 0) / n;

    let sxy = 0;
    let sxx = 0;
    points.forEach((p, i) => {
      sxy += (p.t - tMean) * (deseasonalized[i] - yMean);
      sxx += (p.t - tMean) ** 2;
    });
    const slope = sxx === 0 ? 0 : sxy / sxx;
    const intercept = yMean - slope * tMean;

    // Residuales y desviación estándar
    points.forEach((p, i) => {
      const fitted = intercept + slope * p.t + seasonalOffset[p.dow];
      p.resid = p.y - fitted;
    });
    const sigma = Math.sqrt(
      points.reduce((s, p) => s + p.resid ** 2, 0) / (n - 1 || 1)
    );

    // MAPE (error porcentual absoluto medio) sobre el ajuste
    const nonZero = points.filter(p => p.y > 0);
    const mape = nonZero.length > 0
      ? Math.round((nonZero.reduce((s, p) => s + (Math.abs(p.resid) / p.y), 0) / nonZero.length) * 10000) / 100
      : 0;

    // Pronóstico para los próximos `days` días
    const lastPoint = points[n - 1];
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= days; i++) {
      const date = addDays(lastPoint.date, i);
      const t = lastPoint.t + i;
      const dow = date.getDay();
      const predicted = intercept + slope * t + seasonalOffset[dow];

      // Intervalo de predicción de la regresión
      const se = sigma * Math.sqrt(1 + (1 / n) + ((t - tMean) ** 2) / sxx);
      forecast.push({
        date: format(date, 'yyyy-MM-dd'),
        predicted: Math.max(0, Math.round(predicted)),
        lower: Math.max(0, Math.round(predicted - 1.96 * se)),
        upper: Math.max(0, Math.round(predicted + 1.96 * se))
      });
    }

    return {
      forecast,
      mape,
      seasonality: {
        weekly: dowMeans.map(m => (base > 0 ? Math.round((m / base) * 1000) / 1000 : 1)),
        monthly: this.calculateMonthlySeasonality(points, overallMean)
      }
    };
  }

  private calculateMonthlySeasonality(points: ModelPoint[], overallMean: number): number[] {
    const monthSums = new Array<number>(12).fill(0);
    const monthCounts = new Array<number>(12).fill(0);
    points.forEach(p => {
      const m = p.date.getMonth();
      monthSums[m] += p.y;
      monthCounts[m] += 1;
    });
    return monthSums.map((sum, i) => {
      if (monthCounts[i] === 0 || overallMean === 0) return 1;
      return Math.round(((sum / monthCounts[i]) / overallMean) * 1000) / 1000;
    });
  }
}

export const advancedDemandForecasting = new AdvancedDemandForecasting();

if (process.env.NODE_ENV === 'production') {
  advancedDemandForecasting.scheduleRetraining();
}