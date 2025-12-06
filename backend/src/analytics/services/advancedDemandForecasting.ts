import { Op } from 'sequelize';
import { format, subMonths } from 'date-fns';
import { DetalleSalida, SalidaInventario } from '../../models';
import { cacheService } from '../../services/cache.service';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import * as path from 'path';

interface ProphetForecast {
  ds: string;  // fecha
  yhat: number; // predicción
  yhat_lower: number;
  yhat_upper: number;
}

interface ForecastResult {
  forecast: Array<{
    date: string;
    predicted: number;
    lower: number;
    upper: number;
  }>;
  mape: number;
  seasonality: {
    weekly: number[];
    monthly: number[];
  };
  cached?: boolean;
  lastTrained?: string;
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

  private async getFromCache(key: string): Promise<ForecastResult | null> {
    try {
      return await cacheService.get(key, () => Promise.resolve(null));
    } catch (error) {
      console.error('Error al leer de caché:', error);
      return null;
    }
  }

  private async saveToCache(key: string, data: ForecastResult): Promise<void> {
    try {
      await cacheService.get(key, () => Promise.resolve(data));
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
      const cacheKey = `forecast_${productId}_${days}`;
      
      if (!forceRetrain) {
        const cachedResult = await this.getFromCache(cacheKey);
        if (cachedResult) {
          return { ...cachedResult, cached: true };
        }
      }

      const historicalData = await this.getHistoricalData(productId);
      
      if (historicalData.length < 30) {
        throw new Error('Se requieren al menos 30 días de datos históricos');
      }
      
      const forecastData = await this.callProphetModel(historicalData, days);
      
      const result: ForecastResult = {
        ...forecastData,
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

  private async callProphetModel(data: any[], days: number): Promise<Omit<ForecastResult, 'cached' | 'lastTrained'>> {
    const pythonScriptPath = path.join(__dirname, '../../python_scripts/prophet_forecast.py');
    
    return new Promise((resolve, reject) => {
      const pythonProcess = exec(
        `python "${pythonScriptPath}" '${JSON.stringify(data)}' ${days}`,
        { maxBuffer: 1024 * 1024 * 5 },
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error('Error ejecutando el script de Python:', error);
            return reject(new Error('Error al ejecutar el modelo de pronóstico'));
          }
          
          if (stderr) {
            console.error('Error en el script de Python:', stderr);
          }
          
          try {
            const result = JSON.parse(stdout);
            
            if (result.error) {
              console.error('Error en el modelo:', result);
              return reject(new Error(`Error en el modelo: ${result.error}`));
            }
            
            const forecast = result.forecast.map((item: any) => ({
              date: item.ds,
              predicted: Math.round(item.yhat),
              lower: Math.round(item.yhat_lower),
              upper: Math.round(item.yhat_upper)
            }));
            
            resolve({
              forecast,
              mape: result.mape,
              seasonality: {
                weekly: result.seasonality?.weekly || [],
                monthly: result.seasonality?.yearly?.slice(0, 12) || []
              }
            });
            
          } catch (parseError) {
            console.error('Error al analizar la respuesta de Python:', parseError);
            console.error('Salida de Python:', stdout);
            reject(new Error('Error al procesar los resultados del modelo'));
          }
        }
      );
      
      setTimeout(() => {
        if (!pythonProcess.killed) {
          pythonProcess.kill();
          reject(new Error('Tiempo de espera agotado al ejecutar el modelo'));
        }
      }, 30000);
    });
  }
}

export const advancedDemandForecasting = new AdvancedDemandForecasting();

if (process.env.NODE_ENV === 'production') {
  advancedDemandForecasting.scheduleRetraining();
}