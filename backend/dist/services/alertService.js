"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertService = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
const analytics_1 = require("../analytics");
/**
 * Servicio para gestión de alertas del sistema de inventario
 */
class AlertService {
    // Método para verificar productos con stock bajo
    async checkLowStock() {
        try {
            // Obtener usuario del sistema (primer gerente activo)
            const systemUser = await models_1.User.findOne({
                where: { rol: 'gerente', activo: true }
            });
            if (!systemUser) {
                console.warn('No se encontró un usuario gerente activo para asignar alertas');
                return;
            }
            // Consultar productos con stock bajo
            const lowStockProducts = await models_1.Product.findAll({
                where: {
                    stock_actual: {
                        [sequelize_1.Op.lte]: database_1.sequelize.col('stock_minimo')
                    },
                    activo: true
                }
            });
            for (const product of lowStockProducts) {
                // Verificar si ya existe una alerta no resuelta para este producto
                const existingAlert = await models_1.Alert.findOne({
                    where: {
                        product_id: product.id,
                        type: 'low_stock',
                        resolved: false
                    }
                });
                if (!existingAlert) {
                    // Crear nueva alerta
                    await models_1.Alert.create({
                        type: 'low_stock',
                        message: `El producto "${product.nombre}" tiene stock bajo (${product.stock_actual} unidades, mínimo: ${product.stock_minimo})`,
                        severity: 'high',
                        product_id: product.id,
                        user_id: systemUser.id
                    });
                }
            }
        }
        catch (error) {
            console.error('Error al verificar stock bajo:', error);
            throw new Error('No se pudieron verificar las alertas de stock bajo');
        }
    }
    // Método para verificar sobrestock
    async checkOverstock() {
        try {
            // Obtener usuario del sistema
            const systemUser = await models_1.User.findOne({
                where: { rol: 'gerente', activo: true }
            });
            if (!systemUser) {
                console.warn('No se encontró un usuario gerente activo para asignar alertas');
                return;
            }
            // Obtener todos los productos activos
            const products = await models_1.Product.findAll({
                where: { activo: true }
            });
            for (const product of products) {
                // Obtener pronóstico de demanda para el producto
                const forecastResult = await (0, analytics_1.getDemandForecast)({
                    productId: product.id,
                    monthsToForecast: 1 // Pronóstico para el próximo mes
                });
                if (forecastResult.success && forecastResult.forecast && forecastResult.forecast.length > 0) {
                    const nextMonthForecast = forecastResult.forecast[0].forecastedQuantity;
                    // Calcular si hay sobrestock (stock actual > pronóstico * 2, por ejemplo)
                    const overstockThreshold = nextMonthForecast * 2; // Factor de seguridad
                    if (product.stock_actual > overstockThreshold) {
                        // Verificar si ya existe una alerta no resuelta
                        const existingAlert = await models_1.Alert.findOne({
                            where: {
                                product_id: product.id,
                                type: 'overstock',
                                resolved: false
                            }
                        });
                        if (!existingAlert) {
                            // Crear nueva alerta
                            await models_1.Alert.create({
                                type: 'overstock',
                                message: `El producto "${product.nombre}" tiene sobrestock (${product.stock_actual} unidades, pronóstico demanda: ${nextMonthForecast})`,
                                severity: 'medium',
                                product_id: product.id,
                                user_id: systemUser.id
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error al verificar sobrestock:', error);
            throw new Error('No se pudieron verificar las alertas de sobrestock');
        }
    }
    // Método para verificar tendencias de demanda
    async checkDemandTrends() {
        try {
            // Obtener usuario del sistema
            const systemUser = await models_1.User.findOne({
                where: { rol: 'gerente', activo: true }
            });
            if (!systemUser) {
                console.warn('No se encontró un usuario gerente activo para asignar alertas');
                return;
            }
            // Obtener todos los productos activos
            const products = await models_1.Product.findAll({
                where: { activo: true }
            });
            for (const product of products) {
                // Obtener pronóstico de demanda para el producto
                const forecastResult = await (0, analytics_1.getDemandForecast)({
                    productId: product.id,
                    monthsToForecast: 1 // Pronóstico para el próximo mes
                });
                if (forecastResult.success && forecastResult.historicalData && forecastResult.historicalData.length > 0) {
                    const lastMonthData = forecastResult.historicalData[forecastResult.historicalData.length - 1];
                    const lastMonthActual = lastMonthData.quantity;
                    // Para comparar, necesitamos el pronóstico para el mes pasado
                    // Por simplicidad, usaremos el promedio de los últimos meses como pronóstico
                    const recentMonths = forecastResult.historicalData.slice(-3);
                    const averageForecast = recentMonths.reduce((sum, data) => sum + data.quantity, 0) / recentMonths.length;
                    // Calcular desviación significativa (> 50% diferencia)
                    const deviation = Math.abs(lastMonthActual - averageForecast) / Math.max(averageForecast, 1);
                    const threshold = 0.5; // 50%
                    if (deviation > threshold) {
                        const trendType = lastMonthActual > averageForecast ? 'pico repentino' : 'caída significativa';
                        // Verificar si ya existe una alerta no resuelta
                        const existingAlert = await models_1.Alert.findOne({
                            where: {
                                product_id: product.id,
                                type: 'demand_trend',
                                resolved: false
                            }
                        });
                        if (!existingAlert) {
                            // Crear nueva alerta
                            await models_1.Alert.create({
                                type: 'demand_trend',
                                message: `Tendencia de demanda inusual para "${product.nombre}": ${trendType} (${lastMonthActual} vs pronóstico ${Math.round(averageForecast)})`,
                                severity: 'medium',
                                product_id: product.id,
                                user_id: systemUser.id
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error al verificar tendencias de demanda:', error);
            throw new Error('No se pudieron verificar las alertas de tendencias de demanda');
        }
    }
    // Método para generar recomendaciones basadas en alertas
    async generateRecommendations() {
        try {
            const recommendations = [];
            // Obtener alertas activas con información del producto
            const activeAlerts = await models_1.Alert.findAll({
                where: { resolved: false },
                include: [{
                        model: models_1.Product,
                        as: 'product',
                        attributes: ['id', 'nombre']
                    }],
                order: [['createdAt', 'DESC']]
            });
            for (const alert of activeAlerts) {
                if (!alert.product)
                    continue;
                const productName = alert.product.nombre;
                switch (alert.type) {
                    case 'low_stock':
                        recommendations.push(`Aumentar pedido de "${productName}" - stock actual bajo`);
                        break;
                    case 'overstock':
                        recommendations.push(`Aplicar descuento o promoción a "${productName}" - exceso de stock`);
                        break;
                    case 'demand_trend':
                        if (alert.message.includes('caída significativa')) {
                            recommendations.push(`Investigar causas de la caída en demanda de "${productName}"`);
                        }
                        else if (alert.message.includes('pico repentino')) {
                            recommendations.push(`Aumentar stock y promoción para "${productName}" - demanda creciente`);
                        }
                        break;
                }
            }
            return recommendations;
        }
        catch (error) {
            console.error('Error al generar recomendaciones:', error);
            throw new Error('No se pudieron generar las recomendaciones');
        }
    }
    // Método para ejecutar todas las verificaciones de alertas
    async checkAllAlerts() {
        await this.checkLowStock();
        await this.checkOverstock();
        await this.checkDemandTrends();
    }
}
exports.alertService = new AlertService();
