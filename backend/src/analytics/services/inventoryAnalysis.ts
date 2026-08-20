import { Op, col } from 'sequelize';
import { Product, MovimientoInventario } from '../../models';
import OperacionStock from '../../models/OperacionStock';
import DetalleOperacion from '../../models/DetalleOperacion';
import { subMonths } from 'date-fns';

export interface DateRange {
  fechaInicio?: string;
  fechaFin?: string;
}

export interface FullInventoryMetrics {
  stockBajo: number;
  agotados: number;
  totalProductos: number;
  rotacion: number;
  diasInventario: number;
  capitalInmovilizado: number;
  productosLentos: number;
  sinMovimiento: number;
  stockMuerto: number;
  margenBruto: number;
  roiInventario: number;
  precisionInventario: number;
  cicloConversion: number;
  antiguedadPromedio: number;
  tasaAgotamiento: number;
  valorStockMuerto: number;
  lastUpdated: Date;
}

export interface InventoryMetrics {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryTurnover: number;
  averageStockValue: number;
  lastUpdated: Date;
  daysSalesOfInventory: number;
  grossMargin: number;
  totalInventoryValue: number;
  stockoutRate: number;
  carryingCost: number;
  slowMovingItems: number;
}

export const getInventoryMetrics = async (): Promise<InventoryMetrics> => {
  try {
    const [totalProducts, lowStockItems, outOfStockItems] = await Promise.all([
      Product.count(),
      Product.count({
        where: {
          [Op.or]: [
            { stock_actual: { [Op.lte]: col('stock_minimo') }, stock_minimo: { [Op.gt]: 0 } },
            { stock_minimo: 0, stock_actual: { [Op.and]: { [Op.gt]: 0, [Op.lte]: 5 } } }
          ]
        }
      }),
      Product.count({
        where: {
          stock_actual: { [Op.lte]: 0 }
        }
      })
    ]);

    const products = await Product.findAll({
      attributes: ['id', 'stock_actual', 'precio_venta', 'precio_compra', 'stock_minimo']
    });

    const inventoryMetrics = products.reduce((acc, product) => {
      const stockValue = product.stock_actual * (product.precio_venta || 0);
      return {
        totalValue: acc.totalValue + stockValue,
        totalItems: acc.totalItems + product.stock_actual,
        slowMoving: acc.slowMoving + (product.stock_actual > ((product.stock_minimo || 5) * 3) ? 1 : 0)
      };
    }, { totalValue: 0, totalItems: 0, slowMoving: 0 });

    const ninetyDaysAgo = subMonths(new Date(), 3);

    const ventasResult = await OperacionStock.sum('costo_total', {
      where: {
        tipo_operacion: 'SALIDA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: ninetyDaysAgo }
      }
    });
    const totalSales = Number(ventasResult) || 0;

    const unidadesVendidasResult = await OperacionStock.sum('total_unidades', {
      where: {
        tipo_operacion: 'SALIDA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: ninetyDaysAgo }
      }
    });
    const totalUnitsSold = Number(unidadesVendidasResult) || 0;

    const averageInventoryValue = inventoryMetrics.totalValue / 2;
    const inventoryTurnover = totalSales / (averageInventoryValue || 1);
    const daysSalesOfInventory = totalUnitsSold > 0
      ? (inventoryMetrics.totalItems / (totalUnitsSold / 90))
      : 0;

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
      averageStockValue: parseFloat((inventoryMetrics.totalValue / (products.length || 1)).toFixed(2)),
      daysSalesOfInventory: parseFloat(daysSalesOfInventory.toFixed(1)),
      grossMargin: 0,
      totalInventoryValue: parseFloat(inventoryMetrics.totalValue.toFixed(2)),
      stockoutRate: parseFloat(((outOfStockItems / (totalProducts || 1)) * 100).toFixed(2)),
      carryingCost: parseFloat((inventoryMetrics.totalValue * 0.25).toFixed(2)),
      slowMovingItems: inventoryMetrics.slowMoving,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error al calcular métricas de inventario:', error);
    throw new Error('No se pudieron calcular las métricas de inventario');
  }
};

export const getFullInventoryMetrics = async (dateRange?: DateRange): Promise<FullInventoryMetrics> => {
  try {
    const fechaFin = dateRange?.fechaFin ? new Date(dateRange.fechaFin) : new Date();
    const fechaInicio = dateRange?.fechaInicio
      ? new Date(dateRange.fechaInicio)
      : subMonths(fechaFin, 3);
    const diasPeriodo = Math.max(1, Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)));

    const [totalProductos, stockBajo, agotados] = await Promise.all([
      Product.count({ where: { activo: true } }),
      Product.count({
        where: {
          activo: true,
          [Op.or]: [
            { stock_actual: { [Op.lte]: col('stock_minimo') }, stock_minimo: { [Op.gt]: 0 } },
            { stock_minimo: 0, stock_actual: { [Op.and]: { [Op.gt]: 0, [Op.lte]: 5 } } }
          ]
        }
      }),
      Product.count({
        where: { activo: true, stock_actual: { [Op.lte]: 0 } }
      })
    ]);

    const products = await Product.findAll({
      where: { activo: true },
      attributes: ['id', 'stock_actual', 'precio_venta', 'precio_compra', 'stock_minimo', 'createdAt']
    });

    let totalValue = 0;
    let totalCost = 0;
    let productosLentos = 0;
    let sinMovimiento = 0;
    let stockMuerto = 0;
    let valorStockMuerto = 0;

    for (const product of products) {
      const stockValue = product.stock_actual * (product.precio_venta || 0);
      const costValue = product.stock_actual * (product.precio_compra || 0);
      totalValue += stockValue;
      totalCost += costValue;

      if (product.stock_actual > ((product.stock_minimo || 5) * 3)) {
        productosLentos++;
      }

      if (product.stock_actual > 0) {
        const tieneMovimiento = await MovimientoInventario.findOne({
          where: {
            producto_id: product.id,
            fecha: { [Op.gte]: fechaInicio }
          },
          limit: 1
        });
        if (!tieneMovimiento) {
          sinMovimiento++;
        }
      }

      const fechaLimiteMuerto = subMonths(fechaFin, 6);
      if (product.stock_actual > 0) {
        const tieneMovimientoReciente = await MovimientoInventario.findOne({
          where: {
            producto_id: product.id,
            fecha: { [Op.gte]: fechaLimiteMuerto }
          },
          limit: 1
        });
        if (!tieneMovimientoReciente) {
          stockMuerto++;
          valorStockMuerto += costValue;
        }
      }
    }

    const ventasResult = await OperacionStock.sum('costo_total', {
      where: {
        tipo_operacion: 'SALIDA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin }
      }
    });
    const totalSales = Number(ventasResult) || 0;

    const unidadesVendidasResult = await OperacionStock.sum('total_unidades', {
      where: {
        tipo_operacion: 'SALIDA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin }
      }
    });
    const totalUnitsSold = Number(unidadesVendidasResult) || 0;

    const costosResult = await OperacionStock.sum('costo_total', {
      where: {
        tipo_operacion: 'ENTRADA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin }
      }
    });
    const totalPurchases = Number(costosResult) || 0;

    const antiguedadResult = await OperacionStock.findAll({
      where: {
        tipo_operacion: 'ENTRADA',
        estado: 'PROCESADO',
        fecha_emision: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin }
      },
      attributes: ['fecha_emision'],
      order: [['fecha_emision', 'DESC']],
      limit: 200,
      raw: true
    });

    const ahora = fechaFin;
    let sumaDias = 0;
    let conteo = 0;

    for (const entrada of antiguedadResult) {
      const fechaEntrada = new Date(entrada.fecha_emision);
      const dias = Math.floor((ahora.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24));
      sumaDias += dias;
      conteo++;
    }

    const antiguedadPromedio = conteo > 0 ? Math.round(sumaDias / conteo) : 0;

    const averageInventoryValue = totalValue / 2;
    const rotacion = totalSales > 0
      ? parseFloat((totalSales / (averageInventoryValue || 1)).toFixed(2))
      : 0;

    const diasInventario = totalUnitsSold > 0
      ? parseFloat((totalProductos * diasPeriodo / totalUnitsSold).toFixed(1))
      : 0;

    const margenBruto = totalSales > 0
      ? parseFloat(((totalSales - totalPurchases) / totalSales * 100).toFixed(2))
      : 0;

    const roiInventario = totalCost > 0
      ? parseFloat(((totalSales - totalCost) / totalCost * 100).toFixed(2))
      : 0;

    const precisionInventario = totalProductos > 0
      ? parseFloat((((totalProductos - stockBajo - agotados) / totalProductos) * 100).toFixed(1))
      : 0;

    const cicloConversion = diasInventario;

    const tasaAgotamiento = totalProductos > 0
      ? parseFloat(((agotados / totalProductos) * 100).toFixed(2))
      : 0;

    return {
      stockBajo,
      agotados,
      totalProductos,
      rotacion,
      diasInventario,
      capitalInmovilizado: parseFloat(totalValue.toFixed(2)),
      productosLentos,
      sinMovimiento,
      stockMuerto,
      margenBruto,
      roiInventario,
      precisionInventario,
      cicloConversion,
      antiguedadPromedio,
      tasaAgotamiento,
      valorStockMuerto: parseFloat(valorStockMuerto.toFixed(2)),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error al calcular métricas completas de inventario:', error);
    throw new Error('No se pudieron calcular las métricas de inventario');
  }
};
