"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsNeedingReorder = exports.getInventoryMetrics = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../../models");
const date_fns_1 = require("date-fns");
/**
 * Obtiene métricas clave del inventario con indicadores financieros
 */
const getInventoryMetrics = async () => {
    try {
        // 1. Métricas básicas existentes
        const [totalProducts, lowStockItems, outOfStockItems] = await Promise.all([
            // Conteo total de productos
            models_1.Product.count(),
            // Productos con bajo stock
            models_1.Product.count({
                where: {
                    stock_actual: {
                        [sequelize_1.Op.lt]: 10,
                        [sequelize_1.Op.gt]: 0
                    }
                }
            }),
            // Productos agotados
            models_1.Product.count({
                where: {
                    stock_actual: {
                        [sequelize_1.Op.lte]: 0
                    }
                }
            })
        ]);
        // 2. Obtener todos los productos con sus precios y costos
        const products = await models_1.Product.findAll({
            attributes: ['id', 'stock_actual', 'precio_venta', 'precio_compra', 'stock_minimo']
        });
        // 3. Calcular métricas financieras
        const inventoryMetrics = products.reduce((acc, product) => {
            const stockValue = product.stock_actual * (product.precio_venta || 0);
            const costValue = product.stock_actual * (product.precio_compra || 0);
            return {
                totalValue: acc.totalValue + stockValue,
                totalCost: acc.totalCost + costValue,
                totalItems: acc.totalItems + product.stock_actual,
                slowMoving: acc.slowMoving + (product.stock_actual > ((product.stock_minimo || 5) * 3) ? 1 : 0)
            };
        }, { totalValue: 0, totalCost: 0, totalItems: 0, slowMoving: 0 });
        // 4. Obtener ventas de los últimos 90 días para calcular rotación
        const ninetyDaysAgo = (0, date_fns_1.subMonths)(new Date(), 3);
        const salesData = await models_1.SalidaInventario.findAll({
            where: {
                fecha: { [sequelize_1.Op.gte]: ninetyDaysAgo },
                estado: 'completado'
            },
            include: [{
                    model: models_1.DetalleSalida,
                    include: [models_1.Product]
                }]
        });
        // 5. Calcular ventas totales y costo de ventas
        const salesMetrics = salesData.reduce((acc, sale) => {
            const saleTotal = (sale.detalles || []).reduce((sum, detalle) => {
                return sum + (detalle.cantidad * detalle.precio_unitario);
            }, 0);
            const costOfSales = (sale.detalles || []).reduce((sum, detalle) => {
                return sum + (detalle.cantidad * (detalle.producto?.precio_compra || 0));
            }, 0);
            return {
                totalSales: acc.totalSales + saleTotal,
                totalCostOfSales: acc.totalCostOfSales + costOfSales,
                totalUnitsSold: acc.totalUnitsSold + (sale.detalles || []).reduce((sum, d) => sum + d.cantidad, 0)
            };
        }, { totalSales: 0, totalCostOfSales: 0, totalUnitsSold: 0 });
        // 6. Calcular indicadores finales
        const averageInventoryValue = inventoryMetrics.totalValue / 2;
        const inventoryTurnover = salesMetrics.totalSales / (averageInventoryValue || 1);
        const daysSalesOfInventory = (inventoryMetrics.totalItems / (salesMetrics.totalUnitsSold / 90)) || 0;
        const grossMargin = salesMetrics.totalSales > 0
            ? ((salesMetrics.totalSales - salesMetrics.totalCostOfSales) / salesMetrics.totalSales) * 100
            : 0;
        return {
            totalProducts,
            lowStockItems,
            outOfStockItems,
            inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
            averageStockValue: parseFloat((inventoryMetrics.totalValue / (products.length || 1)).toFixed(2)),
            daysSalesOfInventory: parseFloat(daysSalesOfInventory.toFixed(1)),
            grossMargin: parseFloat(grossMargin.toFixed(2)),
            totalInventoryValue: parseFloat(inventoryMetrics.totalValue.toFixed(2)),
            stockoutRate: parseFloat(((outOfStockItems / (totalProducts || 1)) * 100).toFixed(2)),
            carryingCost: parseFloat((inventoryMetrics.totalValue * 0.25).toFixed(2)), // 25% del valor del inventario
            slowMovingItems: inventoryMetrics.slowMoving,
            lastUpdated: new Date()
        };
    }
    catch (error) {
        console.error('Error al calcular métricas de inventario:', error);
        throw new Error('No se pudieron calcular las métricas de inventario');
    }
};
exports.getInventoryMetrics = getInventoryMetrics;
/**
 * Identifica productos que necesitan reabastecimiento
 */
const getProductsNeedingReorder = async (threshold = 10) => {
    try {
        return await models_1.Product.findAll({
            where: {
                stock_actual: {
                    [sequelize_1.Op.lte]: threshold
                }
            },
            order: [['stock_actual', 'ASC']]
        });
    }
    catch (error) {
        console.error('Error al identificar productos para reabastecer:', error);
        throw new Error('No se pudieron identificar los productos para reabastecer');
    }
};
exports.getProductsNeedingReorder = getProductsNeedingReorder;
