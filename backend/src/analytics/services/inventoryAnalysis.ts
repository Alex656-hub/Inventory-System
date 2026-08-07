import { Op } from 'sequelize';
import { Product, EntradaInventario, SalidaInventario, DetalleSalida, MovimientoInventario, DetalleEntrada } from '../../models';
import { subMonths, subDays } from 'date-fns';

/**
 * Servicio para análisis de inventario
 */

export interface DateRange {
  fechaInicio?: string;
  fechaFin?: string;
}

export interface FullInventoryMetrics {
  // Métricas básicas de stock
  stockBajo: number;
  agotados: number;
  totalProductos: number;
  rotacion: number;
  diasInventario: number;

  // Métricas de capital
  capitalInmovilizado: number;
  productosLentos: number;
  sinMovimiento: number;
  stockMuerto: number;

  // Métricas financieras
  margenBruto: number;
  roiInventario: number;
  precisionInventario: number;

  // Métricas operativas
  cicloConversion: number;
  antiguedadPromedio: number;
  tasaAgotamiento: number;
  valorStockMuerto: number;

  lastUpdated: Date;
}

export interface InventoryMetrics {
  // Métricas existentes
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryTurnover: number;
  averageStockValue: number;
  lastUpdated: Date;
  
  // Nuevos indicadores financieros
  daysSalesOfInventory: number;  // DSI - Días de inventario
  grossMargin: number;           // Margen bruto porcentual
  totalInventoryValue: number;   // Valor total del inventario
  stockoutRate: number;          // Tasa de agotamiento de inventario
  carryingCost: number;          // Costo de mantenimiento de inventario (estimado)
  slowMovingItems: number;       // Productos de movimiento lento
}

/**
 * Obtiene métricas clave del inventario con indicadores financieros
 */
export const getInventoryMetrics = async (): Promise<InventoryMetrics> => {
  try {
    // 1. Métricas básicas existentes
    const [totalProducts, lowStockItems, outOfStockItems] = await Promise.all([
      // Conteo total de productos
      Product.count(),
      
      // Productos con bajo stock
      Product.count({
        where: {
          stock_actual: {
            [Op.lt]: 10,
            [Op.gt]: 0
          }
        }
      }),
      
      // Productos agotados
      Product.count({
        where: {
          stock_actual: {
            [Op.lte]: 0
          }
        }
      })
    ]);

    // 2. Obtener todos los productos con sus precios y costos
    const products = await Product.findAll({
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
    const ninetyDaysAgo = subMonths(new Date(), 3);
    const salesData = await SalidaInventario.findAll({
      where: {
        fecha: { [Op.gte]: ninetyDaysAgo },
        estado: 'completado'
      },
      include: [{
        model: DetalleSalida,
        as: 'detalles',
        include: [{ model: Product, as: 'producto' }]
      }]
    });

    // 5. Calcular ventas totales y costo de ventas
    const salesMetrics = salesData.reduce((acc, sale: any) => {
      const saleTotal = (sale.detalles || []).reduce((sum: number, detalle: any) => {
        return sum + (detalle.cantidad * detalle.precio_unitario);
      }, 0);
      
      const costOfSales = (sale.detalles || []).reduce((sum: number, detalle: any) => {
        return sum + (detalle.cantidad * (detalle.producto?.precio_compra || 0));
      }, 0);
      
      return {
        totalSales: acc.totalSales + saleTotal,
        totalCostOfSales: acc.totalCostOfSales + costOfSales,
        totalUnitsSold: acc.totalUnitsSold + (sale.detalles || []).reduce((sum: number, d: any) => sum + d.cantidad, 0)
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
  } catch (error) {
    console.error('Error al calcular métricas de inventario:', error);
    throw new Error('No se pudieron calcular las métricas de inventario');
  }
};

/**
 * Obtiene las 16 métricas completas del inventario
 */
export const getFullInventoryMetrics = async (dateRange?: DateRange): Promise<FullInventoryMetrics> => {
  try {
    // Determinar rango de fechas para ventas y movimientos
    const fechaFin = dateRange?.fechaFin ? new Date(dateRange.fechaFin) : new Date();
    const fechaInicio = dateRange?.fechaInicio 
      ? new Date(dateRange.fechaInicio) 
      : subMonths(fechaFin, 3);
    const diasPeriodo = Math.max(1, Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)));

    // 1. Métricas básicas de stock (punto en tiempo, no dependen de fecha)
    const [totalProductos, stockBajo, agotados] = await Promise.all([
      Product.count({ where: { activo: true } }),
      Product.count({
        where: {
          activo: true,
          stock_actual: { [Op.lt]: 10, [Op.gt]: 0 }
        }
      }),
      Product.count({
        where: {
          activo: true,
          stock_actual: { [Op.lte]: 0 }
        }
      })
    ]);

    // 2. Obtener productos con datos necesarios
    const products = await Product.findAll({
      where: { activo: true },
      attributes: ['id', 'stock_actual', 'precio_venta', 'precio_compra', 'stock_minimo', 'createdAt']
    });

    // 3. Calcular métricas de inventario
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

      // Productos lentos: stock > 3x stock mínimo
      if (product.stock_actual > ((product.stock_minimo || 5) * 3)) {
        productosLentos++;
      }

      // Productos sin movimiento en el periodo (stock > 0)
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

      // Stock muerto: sin movimiento en el doble del periodo o 6 meses
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

    // 4. Obtener datos de ventas del periodo seleccionado
    const salesData = await SalidaInventario.findAll({
      where: {
        fecha: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin },
        estado: 'completado'
      },
      include: [{
        model: DetalleSalida,
        as: 'detalles',
        include: [{ model: Product, as: 'producto' }]
      }]
    });

    const salesMetrics = salesData.reduce((acc, sale: any) => {
      const saleTotal = (sale.detalles || []).reduce((sum: number, detalle: any) => {
        return sum + (detalle.cantidad * detalle.precio_unitario);
      }, 0);
      
      const costOfSales = (sale.detalles || []).reduce((sum: number, detalle: any) => {
        return sum + (detalle.cantidad * (detalle.producto?.precio_compra || 0));
      }, 0);
      
      return {
        totalSales: acc.totalSales + saleTotal,
        totalCostOfSales: acc.totalCostOfSales + costOfSales,
        totalUnitsSold: acc.totalUnitsSold + (sale.detalles || []).reduce((sum: number, d: any) => sum + d.cantidad, 0)
      };
    }, { totalSales: 0, totalCostOfSales: 0, totalUnitsSold: 0 });

    // 5. Calcular antigüedad promedio del inventario
    const entradas = await DetalleEntrada.findAll({
      include: [{
        model: EntradaInventario,
        as: 'entrada',
        where: { 
          estado: 'pagado',
          fecha: { [Op.gte]: fechaInicio, [Op.lte]: fechaFin }
        }
      }],
      order: [['createdAt', 'DESC']],
      limit: 200
    });

    const ahora = fechaFin;
    let sumaDias = 0;
    let conteo = 0;

    for (const entrada of entradas) {
      const fechaEntrada = new Date(entrada.createdAt);
      const dias = Math.floor((ahora.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24));
      sumaDias += dias;
      conteo++;
    }

    const antiguedadPromedio = conteo > 0 ? Math.round(sumaDias / conteo) : 0;

    // 6. Calcular métricas derivadas
    const averageInventoryValue = totalValue / 2;
    const rotacion = salesMetrics.totalSales > 0 
      ? parseFloat((salesMetrics.totalSales / (averageInventoryValue || 1)).toFixed(2))
      : 0;

    const diasInventario = salesMetrics.totalUnitsSold > 0
      ? parseFloat((totalProductos * diasPeriodo / salesMetrics.totalUnitsSold).toFixed(1))
      : 0;

    const margenBruto = salesMetrics.totalSales > 0
      ? parseFloat(((salesMetrics.totalSales - salesMetrics.totalCostOfSales) / salesMetrics.totalSales * 100).toFixed(2))
      : 0;

    // ROI: (Ventas - Costo Inventario) / Costo Inventario * 100
    const roiInventario = totalCost > 0
      ? parseFloat(((salesMetrics.totalSales - totalCost) / totalCost * 100).toFixed(2))
      : 0;

    // Precisión de inventario (simulada - en un sistema real se compararía con conteo físico)
    const precisionInventario = totalProductos > 0
      ? parseFloat((((totalProductos - stockBajo - agotados) / totalProductos) * 100).toFixed(1))
      : 0;

    // Ciclo de conversión (igual a días de inventario)
    const cicloConversion = diasInventario;

    // Tasa de agotamiento
    const tasaAgotamiento = totalProductos > 0
      ? parseFloat(((agotados / totalProductos) * 100).toFixed(2))
      : 0;

    return {
      stockBajo,
      agotados,
      totalProductos,
      rotacion,
      diasInventario: diasInventario,
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
