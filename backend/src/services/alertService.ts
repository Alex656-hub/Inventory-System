import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Product, Alert, User } from '../models';
import { getDemandForecast } from '../analytics';

/**
 * Servicio para gestión de alertas del sistema de inventario
 */
class AlertService {
  // Método para verificar productos agotados (stock_actual = 0)
  async checkOutOfStock(): Promise<void> {
    try {
      const systemUser = await User.findOne({
        where: { rol: 'gerente', activo: true }
      });

      if (!systemUser) {
        console.warn('No se encontró un usuario gerente activo para asignar alertas');
        return;
      }

      const outOfStockProducts = await Product.findAll({
        where: {
          stock_actual: 0,
          activo: true
        }
      });

      for (const product of outOfStockProducts) {
        const existingAlert = await Alert.findOne({
          where: {
            product_id: product.id,
            type: 'out_of_stock'
          }
        });

        if (!existingAlert) {
          await Alert.create({
            type: 'out_of_stock',
            message: `El producto "${product.nombre}" está agotado (0 unidades disponibles)`,
            severity: 'high',
            product_id: product.id,
            user_id: systemUser.id
          });
        }
      }
    } catch (error) {
      console.error('Error al verificar productos agotados:', error);
      throw new Error('No se pudieron verificar los productos agotados');
    }
  }

  // Método para verificar productos con stock bajo
  async checkLowStock(): Promise<void> {
    try {
      const systemUser = await User.findOne({
        where: { rol: 'gerente', activo: true }
      });

      if (!systemUser) {
        console.warn('No se encontró un usuario gerente activo para asignar alertas');
        return;
      }

      // Productos donde stock_actual <= stock_minimo (y stock_minimo > 0)
      const lowStockProducts = await Product.findAll({
        where: {
          stock_actual: {
            [Op.lte]: sequelize.col('stock_minimo')
          },
          stock_minimo: { [Op.gt]: 0 },
          activo: true
        }
      });

      for (const product of lowStockProducts) {
        const existingAlert = await Alert.findOne({
          where: {
            product_id: product.id,
            type: 'low_stock'
          }
        });

        if (!existingAlert) {
          await Alert.create({
            type: 'low_stock',
            message: `El producto "${product.nombre}" tiene stock bajo (${product.stock_actual} unidades, mínimo: ${product.stock_minimo})`,
            severity: 'high',
            product_id: product.id,
            user_id: systemUser.id
          });
        }
      }

      // También alertar productos con stock_minimo=0 pero stock_actual muy bajo (<=5)
      const criticalProducts = await Product.findAll({
        where: {
          stock_minimo: 0,
          stock_actual: { [Op.and]: { [Op.gt]: 0, [Op.lte]: 5 } },
          activo: true
        }
      });

      for (const product of criticalProducts) {
        const existingAlert = await Alert.findOne({
          where: {
            product_id: product.id,
            type: 'low_stock'
          }
        });

        if (!existingAlert) {
          await Alert.create({
            type: 'low_stock',
            message: `El producto "${product.nombre}" tiene stock crítico (${product.stock_actual} unidades)`,
            severity: 'medium',
            product_id: product.id,
            user_id: systemUser.id
          });
        }
      }
    } catch (error) {
      console.error('Error al verificar stock bajo:', error);
      throw new Error('No se pudieron verificar las alertas de stock bajo');
    }
  }

  // Método para verificar sobrestock
  async checkOverstock(): Promise<void> {
    try {
      // Obtener usuario del sistema
      const systemUser = await User.findOne({
        where: { rol: 'gerente', activo: true }
      });

      if (!systemUser) {
        console.warn('No se encontró un usuario gerente activo para asignar alertas');
        return;
      }

      // Obtener todos los productos activos
      const products = await Product.findAll({
        where: { activo: true }
      });

      for (const product of products) {
        // Obtener pronóstico de demanda para el producto
        const forecastResult = await getDemandForecast({
          productId: product.id,
          monthsToForecast: 1 // Pronóstico para el próximo mes
        });

        if (forecastResult.success && forecastResult.forecast && forecastResult.forecast.length > 0) {
          const nextMonthForecast = forecastResult.forecast[0].forecastedQuantity;

          // Calcular si hay sobrestock (stock actual > pronóstico * 2, por ejemplo)
          const overstockThreshold = nextMonthForecast * 2; // Factor de seguridad

          if (product.stock_actual > overstockThreshold) {
            // Verificar si ya existe una alerta no resuelta
            const existingAlert = await Alert.findOne({
              where: {
                product_id: product.id,
                type: 'overstock',
                resolved: false
              }
            });

            if (!existingAlert) {
              // Crear nueva alerta
              await Alert.create({
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
    } catch (error) {
      console.error('Error al verificar sobrestock:', error);
      throw new Error('No se pudieron verificar las alertas de sobrestock');
    }
  }

  // Método para verificar tendencias de demanda
  async checkDemandTrends(): Promise<void> {
    try {
      // Obtener usuario del sistema
      const systemUser = await User.findOne({
        where: { rol: 'gerente', activo: true }
      });

      if (!systemUser) {
        console.warn('No se encontró un usuario gerente activo para asignar alertas');
        return;
      }

      // Obtener todos los productos activos
      const products = await Product.findAll({
        where: { activo: true }
      });

      for (const product of products) {
        // Obtener pronóstico de demanda para el producto
        const forecastResult = await getDemandForecast({
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
            const existingAlert = await Alert.findOne({
              where: {
                product_id: product.id,
                type: 'demand_trend',
                resolved: false
              }
            });

            if (!existingAlert) {
              // Crear nueva alerta
              await Alert.create({
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
    } catch (error) {
      console.error('Error al verificar tendencias de demanda:', error);
      throw new Error('No se pudieron verificar las alertas de tendencias de demanda');
    }
  }

  // Método para generar recomendaciones basadas en alertas
  async generateRecommendations(): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      // Obtener alertas activas con información del producto
      const activeAlerts = await Alert.findAll({
        where: { resolved: false },
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'nombre']
        }],
        order: [['createdAt', 'DESC']]
      });

      for (const alert of activeAlerts) {
        if (!alert.product) continue;

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
            } else if (alert.message.includes('pico repentino')) {
              recommendations.push(`Aumentar stock y promoción para "${productName}" - demanda creciente`);
            }
            break;
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error al generar recomendaciones:', error);
      throw new Error('No se pudieron generar las recomendaciones');
    }
  }

  // Método para resolver alertas de un producto cuando se compra más stock
  async resolveAlertsForProduct(productId: number): Promise<void> {
    try {
      // Resolver alertas de low_stock y out_of_stock para este producto
      await Alert.update(
        { resolved: true },
        {
          where: {
            product_id: productId,
            type: { [Op.in]: ['low_stock', 'out_of_stock'] },
            resolved: false
          }
        }
      );
    } catch (error) {
      console.error('Error al resolver alertas para producto:', error);
    }
  }

  // Método para ejecutar todas las verificaciones de alertas
  async checkAllAlerts(): Promise<void> {
    await this.checkOutOfStock();
    await this.checkLowStock();
    await this.checkOverstock();
    await this.checkDemandTrends();
  }
}

export const alertService = new AlertService();
