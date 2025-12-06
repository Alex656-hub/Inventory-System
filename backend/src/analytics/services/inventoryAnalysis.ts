import { Op } from 'sequelize';
import { Product, EntradaInventario, SalidaInventario } from '../../models';
import { subMonths } from 'date-fns';

/**
 * Servicio para análisis de inventario
 */

export interface InventoryMetrics {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryTurnover: number;
  averageStockValue: number;
  lastUpdated: Date;
}

/**
 * Obtiene métricas clave del inventario
 */
export const getInventoryMetrics = async (): Promise<InventoryMetrics> => {
  try {
    // Obtener conteo total de productos
    const totalProducts = await Product.count();
    
    // Contar productos con bajo stock (menos de 10 unidades)
    const lowStockItems = await Product.count({
      where: {
        stock_actual: {
          [Op.lt]: 10,
          [Op.gt]: 0
        }
      }
    });

    // Contar productos agotados
    const outOfStockItems = await Product.count({
      where: {
        stock_actual: {
          [Op.lte]: 0
        }
      }
    });

    // Calcular rotación de inventario (simplificado)
    const threeMonthsAgo = subMonths(new Date(), 3);
    const sales = await SalidaInventario.sum('total', {
      where: {
        fecha: {
          [Op.gte]: threeMonthsAgo
        },
        estado: 'completado'
      }
    });

    const averageInventory = await Product.sum('stock_actual') / 2; // Promedio simple
    const inventoryTurnover = sales / (averageInventory || 1);

    // Calcular valor promedio del inventario
    const products = await Product.findAll({
      attributes: ['id', 'stock_actual', 'precio_venta']
    });

    const totalValue = products.reduce((sum, product) => {
      return sum + (product.stock_actual * (product.precio_venta || 0));
    }, 0);

    const averageStockValue = totalValue / (products.length || 1);

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      inventoryTurnover: parseFloat(inventoryTurnover.toFixed(2)),
      averageStockValue: parseFloat(averageStockValue.toFixed(2)),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error al calcular métricas de inventario:', error);
    throw new Error('No se pudieron calcular las métricas de inventario');
  }
};

/**
 * Identifica productos que necesitan reabastecimiento
 */
export const getProductsNeedingReorder = async (threshold: number = 10) => {
  try {
    return await Product.findAll({
      where: {
        stock_actual: {
          [Op.lte]: threshold
        }
      },
      order: [['stock_actual', 'ASC']]
    });
  } catch (error) {
    console.error('Error al identificar productos para reabastecer:', error);
    throw new Error('No se pudieron identificar los productos para reabastecer');
  }
};
