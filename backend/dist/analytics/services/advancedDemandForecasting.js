"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedDemandForecasting = exports.AdvancedDemandForecasting = void 0;
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const models_1 = require("../../models");
const cache_service_1 = require("../../services/cache.service");
const cron = __importStar(require("node-cron"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class AdvancedDemandForecasting {
    async getHistoricalData(productId, months = 12) {
        const endDate = new Date();
        const startDate = (0, date_fns_1.subMonths)(endDate, months);
        const sales = await models_1.SalidaInventario.findAll({
            where: {
                fecha: { [sequelize_1.Op.between]: [startDate, endDate] },
                estado: 'completado'
            },
            include: [{
                    model: models_1.DetalleSalida,
                    where: { producto_id: productId },
                    required: true
                }],
            order: [['fecha', 'ASC']],
            raw: true,
            nest: true
        });
        const dailySales = sales.reduce((acc, sale) => {
            const dateStr = (0, date_fns_1.format)(new Date(sale.fecha), 'yyyy-MM-dd');
            if (!acc[dateStr]) {
                acc[dateStr] = 0;
            }
            const detalles = Array.isArray(sale.DetalleSalidas) ? sale.DetalleSalidas : [sale.DetalleSalidas];
            const cantidadTotal = detalles.reduce((sum, detalle) => sum + (detalle.cantidad || 0), 0);
            acc[dateStr] += cantidadTotal;
            return acc;
        }, {});
        return Object.entries(dailySales).map(([date, quantity]) => ({
            ds: date,
            y: quantity
        }));
    }
    async getFromCache(key) {
        try {
            return await cache_service_1.cacheService.get(key, () => Promise.resolve(null));
        }
        catch (error) {
            console.error('Error al leer de caché:', error);
            return null;
        }
    }
    async saveToCache(key, data) {
        try {
            await cache_service_1.cacheService.get(key, () => Promise.resolve(data));
        }
        catch (error) {
            console.error('Error al guardar en caché:', error);
        }
    }
    async clearCache(keys) {
        if (keys) {
            cache_service_1.cacheService.del(Array.isArray(keys) ? keys : [keys]);
        }
        else {
            cache_service_1.cacheService.flush();
        }
    }
    scheduleRetraining(cronExpression = '0 3 * * 0') {
        cron.schedule(cronExpression, async () => {
            console.log('Iniciando reentrenamiento programado de modelos...');
            try {
                await this.clearCache();
                console.log('Reentrenamiento completado');
            }
            catch (error) {
                console.error('Error en el reentrenamiento programado:', error);
            }
        });
    }
    async getAdvancedForecast(productId, days = 30, forceRetrain = false) {
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
            const result = {
                ...forecastData,
                cached: false,
                lastTrained: new Date().toISOString()
            };
            await this.saveToCache(cacheKey, result);
            return result;
        }
        catch (error) {
            console.error('Error en el pronóstico avanzado:', error);
            throw new Error(`Error al generar el pronóstico de demanda: ${error.message}`);
        }
    }
    async callProphetModel(data, days) {
        const pythonScriptPath = path.join(__dirname, '../../python_scripts/prophet_forecast.py');
        return new Promise((resolve, reject) => {
            const pythonProcess = (0, child_process_1.exec)(`python "${pythonScriptPath}" '${JSON.stringify(data)}' ${days}`, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
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
                    const forecast = result.forecast.map((item) => ({
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
                }
                catch (parseError) {
                    console.error('Error al analizar la respuesta de Python:', parseError);
                    console.error('Salida de Python:', stdout);
                    reject(new Error('Error al procesar los resultados del modelo'));
                }
            });
            setTimeout(() => {
                if (!pythonProcess.killed) {
                    pythonProcess.kill();
                    reject(new Error('Tiempo de espera agotado al ejecutar el modelo'));
                }
            }, 30000);
        });
    }
}
exports.AdvancedDemandForecasting = AdvancedDemandForecasting;
exports.advancedDemandForecasting = new AdvancedDemandForecasting();
if (process.env.NODE_ENV === 'production') {
    exports.advancedDemandForecasting.scheduleRetraining();
}
