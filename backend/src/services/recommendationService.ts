import { Op } from 'sequelize';
import { Product, Alert, User, Supplier, Recommendation } from '../models';
import { getDemandForecast } from '../analytics';

/**
 * Servicio motor de recomendaciones basado en análisis de inventario y forecasting
 */
class RecommendationService {
  
  /**
   * Genera todas las recomendaciones basadas en alertas activas
   */
  async generateAllRecommendations(userId: number): Promise<Recommendation[]> {
    try {
      const activeAlerts = await Alert.findAll({
        where: { resolved: false },
        include: [{ model: Product, as: 'product' }],
        order: [['createdAt', 'DESC']]
      });

      const recommendations: Recommendation[] = [];

      for (const alert of activeAlerts) {
        if (!alert.product) continue;
        
        const rec = await this.generateRecommendationForAlert(alert, userId);
        if (rec) {
          recommendations.push(rec);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error generando todas las recomendaciones:', error);
      throw new Error('No se pudieron generar las recomendaciones');
    }
  }

  /**
   * Convierte una alerta específica en una recomendación cuantitativa y accionable
   */
  private async generateRecommendationForAlert(alert: Alert, userId: number): Promise<Recommendation | null> {
    const product = alert.product!;
    const forecastResult = await getDemandForecast({
      productId: product.id,
      monthsToForecast: 1
    });

    let forecastedQty = product.stock_minimo || 0;
    if (forecastResult.success && forecastResult.forecast && forecastResult.forecast.length > 0) {
      forecastedQty = forecastResult.forecast[0].forecastedQuantity;
    }

    let tipo: 'REORDEN' | 'PROMOCION' | 'INVESTIGAR' | 'DESCARTAR' | 'AJUSTE' = 'INVESTIGAR';
    let titulo = '';
    let descripcion = '';
    let cantidadSugerida: number | null = null;
    let impacto = 0;

    switch (alert.type) {
      case 'out_of_stock':
      case 'low_stock':
        tipo = 'REORDEN';
        titulo = `Reabastecimiento Urgente: ${product.nombre}`;
        
        const safetyStock = product.stock_minimo || 5;
        cantidadSugerida = Math.max(
          forecastedQty + safetyStock,
          (safetyStock * 2) - product.stock_actual
        );
        
        descripcion = `El producto ha caído por debajo del stock mínimo. Se sugiere reponer ${cantidadSugerida} unidades para cubrir la demanda estimada de ${forecastedQty} unidades y mantener un stock de seguridad.`;
        impacto = forecastedQty * (product.precio_venta || 0);
        break;

      case 'overstock':
        tipo = 'PROMOCION';
        titulo = `Optimización de Stock: ${product.nombre}`;
        
        const exceso = product.stock_actual - (forecastedQty * 2);
        cantidadSugerida = exceso > 0 ? exceso : 0;
        
        descripcion = `Se ha detectado un exceso de ${cantidadSugerida} unidades sobre el pronóstico de demanda. Se sugiere aplicar una promoción o descuento para liberar capital inmovilizado.`;
        impacto = cantidadSugerida * (product.precio_compra || 0);
        break;

      case 'demand_trend':
        if (alert.message.includes('pico repentino')) {
          tipo = 'AJUSTE';
          titulo = `Ajuste de Stock al Alza: ${product.nombre}`;
          cantidadSugerida = Math.round(forecastedQty * 0.5);
          descripcion = `La demanda ha crecido repentinamente. Se sugiere incrementar el stock de seguridad en ${cantidadSugerida} unidades para evitar quiebres.`;
          impacto = cantidadSugerida * (product.precio_venta || 0);
        } else {
          tipo = 'INVESTIGAR';
          titulo = `Análisis de Caída de Demanda: ${product.nombre}`;
          descripcion = `Se ha detectado una caída significativa en la demanda. Se recomienda investigar causas externas o ajustar precios antes de realizar nuevos pedidos.`;
          impacto = (product.stock_actual * (product.precio_compra || 0)) * 0.2;
        }
        break;
    }

    const costoEstimado = cantidadSugerida ? cantidadSugerida * (product.precio_compra || 0) : null;
    const prioridad = this.calculatePriority(alert, product, impacto);
    
    const supplier = await Supplier.findByPk(product.proveedor_id || 0);
    const proveedorId = supplier?.id ?? undefined;

    const existing = await Recommendation.findOne({
      where: { alert_id: alert.id, estado: 'PENDIENTE' }
    });
    if (existing) return null;

    return await Recommendation.create({
      alert_id: alert.id,
      product_id: product.id,
      proveedor_id: proveedorId,
      tipo,
      prioridad,
      titulo,
      descripcion,
      cantidad_sugerida: cantidadSugerida,
      costo_estimado: costoEstimado,
      impacto_estimado: impacto,
      user_id: userId,
      estado: 'PENDIENTE'
    });
  }

  private calculatePriority(alert: Alert, product: Product, impacto: number): 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA' {
    if (alert.type === 'out_of_stock' || (alert.type === 'low_stock' && product.stock_actual === 0)) {
      return 'URGENTE';
    }
    if (alert.type === 'low_stock' || (alert.type === 'demand_trend' && alert.message.includes('pico repentino'))) {
      return 'ALTA';
    }
    if (impacto > 1000) {
      return 'MEDIA';
    }
    return 'BAJA';
  }

  async acceptRecommendation(id: number): Promise<Recommendation> {
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) throw new Error('Recomendación no encontrada');
    recommendation.estado = 'ACEPTADA';
    await recommendation.save();
    if (recommendation.alert_id) {
      await Alert.update({ resolved: true }, { where: { id: recommendation.alert_id } });
    }
    return recommendation;
  }

  async rejectRecommendation(id: number): Promise<Recommendation> {
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) throw new Error('Recomendación no encontrada');
    recommendation.estado = 'RECHAZADA';
    await recommendation.save();
    if (recommendation.alert_id) {
      await Alert.update({ resolved: true }, { where: { id: recommendation.alert_id } });
    }
    return recommendation;
  }

  async executeRecommendation(id: number): Promise<{ success: boolean; message: string }> {
    const recommendation = await Recommendation.findByPk(id, {
      include: [{ model: Product, as: 'product' }]
    });
    if (!recommendation) throw new Error('Recomendación no encontrada');

    if (recommendation.tipo === 'REORDEN' || recommendation.tipo === 'AJUSTE') {
      if (!recommendation.product) throw new Error('Producto no vinculado');
      const qty = recommendation.cantidad_sugerida || 0;
      if (qty <= 0) throw new Error('Cantidad sugerida no válida para ejecución');

      await Product.update(
        { stock_actual: (recommendation.product as any).stock_actual + qty },
        { where: { id: recommendation.product_id } }
      );
      recommendation.estado = 'EJECUTADA';
      await recommendation.save();
      return { 
        success: true, 
        message: `Se han añadido ${qty} unidades a ${recommendation.product.nombre} exitosamente.` 
      };
    }
    return { 
      success: false, 
      message: 'Este tipo de recomendación requiere acciones manuales y no puede ejecutarse automáticamente.' 
    };
  }
}

export const recommendationService = new RecommendationService();
