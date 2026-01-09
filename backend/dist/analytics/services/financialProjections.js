"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBreakEvenPoint = exports.getFinancialProjections = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../../models");
const date_fns_1 = require("date-fns");
/**
 * Obtiene proyecciones financieras para los próximos meses
 */
const getFinancialProjections = async (months = 6) => {
    try {
        // Obtener datos históricos de los últimos 12 meses
        const twelveMonthsAgo = (0, date_fns_1.subMonths)(new Date(), 12);
        // Obtener ventas de los últimos 12 meses
        const sales = await models_1.SalidaInventario.findAll({
            where: {
                fecha: {
                    [sequelize_1.Op.gte]: twelveMonthsAgo,
                    [sequelize_1.Op.lte]: new Date()
                },
                estado: 'completado'
            },
            attributes: ['fecha', 'total'],
            order: [['fecha', 'ASC']]
        });
        // Obtener gastos de los últimos 12 meses
        const expenses = await models_1.EntradaInventario.findAll({
            where: {
                fecha: {
                    [sequelize_1.Op.gte]: twelveMonthsAgo,
                    [sequelize_1.Op.lte]: new Date()
                }
            },
            attributes: ['fecha', 'total'],
            order: [['fecha', 'ASC']]
        });
        // Agrupar por mes
        const monthlyData = {};
        // Procesar ventas
        sales.forEach(sale => {
            const month = (0, date_fns_1.format)(sale.fecha, 'yyyy-MM');
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, expenses: 0 };
            }
            monthlyData[month].revenue += parseFloat(sale.total.toString());
        });
        // Procesar gastos
        expenses.forEach(expense => {
            const month = (0, date_fns_1.format)(expense.fecha, 'yyyy-MM');
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
        const projections = [];
        const lastMonth = monthlyArray[monthlyArray.length - 1];
        const lastDate = new Date(lastMonth.month + '-01');
        // Usar la tendencia de los últimos 3 meses para la proyección
        const trend = movingAverages.length > 1
            ? (movingAverages[movingAverages.length - 1].revenue - movingAverages[movingAverages.length - 2].revenue) / 3
            : 0;
        for (let i = 1; i <= months; i++) {
            const projectionDate = (0, date_fns_1.addMonths)(lastDate, i);
            const monthStr = (0, date_fns_1.format)(projectionDate, 'yyyy-MM');
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
    }
    catch (error) {
        console.error('Error al generar proyecciones financieras:', error);
        throw new Error('No se pudieron generar las proyecciones financieras');
    }
};
exports.getFinancialProjections = getFinancialProjections;
/**
 * Calcula el punto de equilibrio basado en costos fijos y márgenes
 */
const calculateBreakEvenPoint = async () => {
    try {
        // Obtener costos fijos (simplificado: gastos del último mes)
        const lastMonth = (0, date_fns_1.format)((0, date_fns_1.subMonths)(new Date(), 1), 'yyyy-MM-01');
        const currentMonth = (0, date_fns_1.format)(new Date(), 'yyyy-MM-01');
        const fixedCosts = await models_1.EntradaInventario.sum('total', {
            where: {
                fecha: {
                    [sequelize_1.Op.gte]: lastMonth,
                    [sequelize_1.Op.lt]: currentMonth
                }
            }
        }) || 10000; // Valor por defecto si no hay datos
        // Obtener precio promedio y costo variable por unidad
        const products = await models_1.Product.findAll({
            attributes: ['precio_venta', 'precio_compra']
        });
        const totalPrice = products.reduce((sum, p) => sum + (p.precio_venta || 0), 0);
        const totalCost = products.reduce((sum, p) => sum + (p.precio_compra || 0), 0);
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
    }
    catch (error) {
        console.error('Error al calcular el punto de equilibrio:', error);
        throw new Error('No se pudo calcular el punto de equilibrio');
    }
};
exports.calculateBreakEvenPoint = calculateBreakEvenPoint;
