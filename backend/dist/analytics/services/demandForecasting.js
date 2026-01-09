"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDemandForecast = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../../models");
const date_fns_1 = require("date-fns");
/**
 * Obtiene el pronóstico de demanda para un producto o categoría
 */
const getDemandForecast = async (options = {}) => {
    const { productId, categoryId, monthsToForecast = 3, confidenceLevel = 0.95 } = options;
    try {
        // Obtener datos históricos de ventas
        const historicalData = await getHistoricalSalesData({
            productId,
            categoryId,
            months: 12 // Últimos 12 meses de datos
        });
        // Aquí iría la lógica de pronóstico real
        // Por ahora, devolvemos un pronóstico simple basado en el promedio móvil
        const forecast = calculateSimpleMovingAverage(historicalData.map(d => ({ month: d.month, quantity: d.quantity })), monthsToForecast);
        return {
            success: true,
            forecast,
            confidence: confidenceLevel,
            historicalData
        };
    }
    catch (error) {
        console.error('Error en el pronóstico de demanda:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return {
            success: false,
            error: 'Error al calcular el pronóstico de demanda',
            details: errorMessage
        };
    }
};
exports.getDemandForecast = getDemandForecast;
/**
 * Obtiene datos históricos de ventas
 */
async function getHistoricalSalesData(params) {
    const { productId, categoryId, months } = params;
    const endDate = new Date();
    const startDate = (0, date_fns_1.subMonths)(endDate, months);
    // Construir condiciones de consulta
    const where = {
        fecha: {
            [sequelize_1.Op.gte]: startDate,
            [sequelize_1.Op.lte]: endDate,
            [sequelize_1.Op.not]: null
        },
        estado: 'completado' // Solo ventas completadas
    };
    // Incluir detalles de la venta
    const include = [
        {
            model: models_1.DetalleSalida,
            as: 'detalles',
            include: [
                {
                    model: models_1.Product,
                    as: 'producto',
                    attributes: ['id', 'nombre', 'categoria_id']
                }
            ]
        }
    ];
    // Aplicar filtros
    if (productId) {
        include[0].include[0].where = { producto_id: productId };
    }
    else if (categoryId) {
        include[0].include[0].include[0].where = { categoria_id: categoryId };
    }
    // Obtener datos de salidas de inventario (ventas)
    const sales = (await models_1.SalidaInventario.findAll({
        where,
        include,
        order: [['fecha', 'ASC']]
    }));
    // Procesar datos para agrupar por mes
    const monthlyData = sales.reduce((acc, sale) => {
        const saleDate = typeof sale.fecha === 'string'
            ? (0, date_fns_1.parseISO)(sale.fecha)
            : new Date(sale.fecha);
        const month = (0, date_fns_1.format)(saleDate, 'yyyy-MM');
        if (!acc[month]) {
            acc[month] = {
                month,
                quantity: 0,
                revenue: 0
            };
        }
        // Sumar cantidades y montos de los detalles
        sale.detalles.forEach(detalle => {
            acc[month].quantity += detalle.cantidad;
            acc[month].revenue += detalle.precio_unitario * detalle.cantidad;
        });
        return acc;
    }, {});
    return Object.values(monthlyData);
}
/**
 * Calcula un pronóstico simple usando promedio móvil
 */
function calculateSimpleMovingAverage(historicalData, periods) {
    if (historicalData.length === 0)
        return [];
    // Ordenar por mes por si acaso
    const sortedData = [...historicalData].sort((a, b) => a.month.localeCompare(b.month));
    // Calcular el promedio de los últimos 3 meses
    const lastMonths = sortedData
        .slice(-3)
        .reduce((sum, data) => sum + data.quantity, 0);
    const average = Math.round(lastMonths / Math.min(3, sortedData.length) || 1);
    // Obtener la última fecha de los datos históricos
    const lastDataPoint = sortedData[sortedData.length - 1];
    if (!lastDataPoint)
        return [];
    // Generar pronóstico para los próximos meses
    const forecast = [];
    const lastDate = new Date(lastDataPoint.month + '-01');
    for (let i = 1; i <= periods; i++) {
        const forecastDate = (0, date_fns_1.addMonths)(lastDate, i);
        forecast.push({
            month: (0, date_fns_1.format)(forecastDate, 'yyyy-MM'),
            forecastedQuantity: average,
            confidenceInterval: {
                lower: Math.max(0, Math.round(average * 0.8)), // -20% (mínimo 0)
                upper: Math.round(average * 1.2) // +20%
            }
        });
    }
    return forecast;
}
/**
 * Calcula el error cuadrático medio (MSE) para evaluar el modelo
 */
function calculateMeanSquaredError(actual, predicted) {
    if (actual.length !== predicted.length) {
        throw new Error('Los arreglos deben tener la misma longitud');
    }
    let sumSquaredError = 0;
    for (let i = 0; i < actual.length; i++) {
        const error = actual[i] - predicted[i];
        sumSquaredError += error * error;
    }
    return sumSquaredError / actual.length;
}
