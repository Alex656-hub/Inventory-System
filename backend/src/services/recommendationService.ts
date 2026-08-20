import { Op, QueryTypes } from 'sequelize';
import { subDays, subMonths } from 'date-fns';
import { Product, Alert, Supplier, Recommendation, MovimientoInventario, User, Descuento } from '../models';
import { getDemandForecast } from '../analytics';
import { sequelize } from '../config/database';

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

      // Escaneos de análisis: recomendaciones sobre productos sin alerta.
      // (stock muerto / sin movimiento detectados por el módulo de análisis)
      await this.scanLiquidacion(userId);
      await this.scanNoReponer(userId);

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
        // Fórmula deliberadamente más conservadora que (Demanda × 1.5) − Stock:
        // evita sobre-pedido cubriendo demanda pronosticada + stock de seguridad.
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
          if (product.stock_actual > 0 && await this.esStockMuerto(product.id)) {
            tipo = 'DESCARTAR';
            titulo = `Stock Muerto: ${product.nombre}`;
            cantidadSugerida = null;
            descripcion = `El producto no presenta movimiento en los últimos 6 meses. Se sugiere NO reponer y evaluar liquidación u oferta para liberar capital inmovilizado.`;
            impacto = product.stock_actual * (product.precio_compra || 0);
          } else {
            tipo = 'INVESTIGAR';
            titulo = `Análisis de Caída de Demanda: ${product.nombre}`;
            descripcion = `Se ha detectado una caída significativa en la demanda. Se recomienda investigar causas externas o ajustar precios antes de realizar nuevos pedidos.`;
            impacto = (product.stock_actual * (product.precio_compra || 0)) * 0.2;
          }
        }
        break;
    }

    const costoEstimado = cantidadSugerida ? cantidadSugerida * (product.precio_compra || 0) : null;
    const prioridad = this.calculatePriority(alert, product, impacto);
    
    const supplier = await Supplier.findByPk(product.proveedor_id || 0);
    const proveedorId = supplier?.id ?? undefined;

    const existing = await Recommendation.findOne({
      where: {
        alert_id: alert.id,
        estado: { [Op.in]: ['PENDIENTE', 'ACEPTADA'] }
      }
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

  /**
   * Unidades vendidas por producto en los últimos 30 días (una sola query).
   */
  private async getUnidadesVendidasUltimos30Dias(): Promise<Map<number, number>> {
    const fechaLimite = subDays(new Date(), 30);
    const rows = await sequelize.query<{ producto_id: string; total: string }>(
      `
      SELECT ds.producto_id,
             COALESCE(SUM(ds.cantidad), 0)::numeric AS total
      FROM detalle_salidas ds
      INNER JOIN salidas_inventario si ON ds.salida_id = si.id
      WHERE si.fecha >= :fechaLimite
        AND si.estado = 'completado'
      GROUP BY ds.producto_id
      `,
      {
        replacements: { fechaLimite },
        type: QueryTypes.SELECT
      }
    );

    const map = new Map<number, number>();
    rows.forEach((row) => {
      const productId = Number(row.producto_id);
      const total = Number(row.total) || 0;
      if (Number.isFinite(productId)) {
        map.set(productId, total);
      }
    });
    return map;
  }

  /**
   * Scan analítico: productos con stock > 0 y SIN ventas en los últimos 30 días
   * → recomendación PROMOCION (oferta/liquidación para liberar capital).
   */
  private async scanLiquidacion(userId: number): Promise<void> {
    const ventas = await this.getUnidadesVendidasUltimos30Dias();

    const productos = await Product.findAll({
      where: { activo: true, stock_actual: { [Op.gt]: 0 } },
      attributes: ['id', 'nombre', 'stock_actual', 'precio_compra', 'precio_venta']
    });

    for (const product of productos) {
      const unidadesVendidas = ventas.get(product.id) || 0;
      if (unidadesVendidas > 0) continue;

      const existing = await Recommendation.findOne({
        where: {
          product_id: product.id,
          tipo: 'PROMOCION',
          alert_id: null,
          estado: { [Op.in]: ['PENDIENTE', 'ACEPTADA'] }
        } as any
      });
      if (existing) continue;

      const impacto = product.stock_actual * (product.precio_compra || 0);

      await Recommendation.create({
        alert_id: undefined,
        product_id: product.id,
        tipo: 'PROMOCION',
        prioridad: 'MEDIA',
        titulo: `Liquidación: ${product.nombre}`,
        descripcion: `Producto sin ventas en los últimos 30 días. Stock disponible: ${product.stock_actual} und. Se sugiere aplicar oferta/descuento para liberar S/ ${impacto.toLocaleString()} de capital inmovilizado.`,
        cantidad_sugerida: null,
        costo_estimado: null,
        impacto_estimado: impacto,
        estado: 'PENDIENTE',
        user_id: userId
      });
    }
  }

  /**
   * Scan analítico: productos con demanda demasiado baja en 30 días
   * (regla: ventas < 5 si stock < 10, ventas < 10 si stock >= 10)
   * → recomendación DESCARTAR (no reponer hasta alcanzar stock mínimo).
   */
  private async scanNoReponer(userId: number): Promise<void> {
    const ventas = await this.getUnidadesVendidasUltimos30Dias();

    const productos = await Product.findAll({
      where: { activo: true, stock_actual: { [Op.gt]: 0 } },
      attributes: ['id', 'nombre', 'stock_actual', 'stock_minimo', 'precio_compra']
    });

    for (const product of productos) {
      const unidadesVendidas = ventas.get(product.id) || 0;
      const umbral = product.stock_actual >= 10 ? 10 : 5;
      if (unidadesVendidas >= umbral) continue;

      const existing = await Recommendation.findOne({
        where: {
          product_id: product.id,
          tipo: 'DESCARTAR',
          alert_id: null,
          estado: { [Op.in]: ['PENDIENTE', 'ACEPTADA'] }
        } as any
      });
      if (existing) continue;

      const impacto = product.stock_actual * (product.precio_compra || 0);

      await Recommendation.create({
        alert_id: undefined,
        product_id: product.id,
        tipo: 'DESCARTAR',
        prioridad: 'BAJA',
        titulo: `No reponer: ${product.nombre}`,
        descripcion: `Ventas en 30 días: ${unidadesVendidas} und (stock: ${product.stock_actual}, mínimo: ${product.stock_minimo}). Se recomienda NO reponer hasta alcanzar el stock mínimo y evaluar ofertas para mover el inventario.`,
        cantidad_sugerida: null,
        costo_estimado: null,
        impacto_estimado: impacto,
        estado: 'PENDIENTE',
        user_id: userId
      });
    }
  }

  private async esStockMuerto(productId: number): Promise<boolean> {
    const fechaLimite = subMonths(new Date(), 6);
    const movimiento = await MovimientoInventario.findOne({
      where: {
        producto_id: productId,
        fecha: { [Op.gte]: fechaLimite }
      },
      limit: 1
    });
    return !movimiento;
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

  async acceptRecommendation(
    id: number,
    data?: { descuento?: number; promocion_hasta?: string | Date | null }
  ): Promise<Recommendation> {
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) throw new Error('Recomendación no encontrada');

    // Si es una promoción y el gerente la acepta, aplicar el descuento al producto
    if (recommendation.tipo === 'PROMOCION' && data && data.descuento !== undefined) {
      const descuento = Number(data.descuento);
      if (descuento <= 0 || descuento > 100) {
        throw new Error('Descuento inválido: debe estar entre 1 y 100');
      }
      let promocionHasta: Date;
      if (data.promocion_hasta) {
        promocionHasta = new Date(data.promocion_hasta);
        if (isNaN(promocionHasta.getTime())) {
          throw new Error('Fecha de vigencia inválida');
        }
      } else {
        promocionHasta = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default +30 días
      }
      await Product.update(
        {
          descuento_promocion: descuento,
          promocion_hasta: promocionHasta
        },
        { where: { id: recommendation.product_id } }
      );
      // Registrar en la tabla de descuentos para trazabilidad y prioridad
      // (fuente 'recomendacion' nunca se sobrescribe con descuentos masivos).
      await Descuento.create({
        porcentaje: descuento,
        fecha_inicio: new Date(),
        fecha_fin: promocionHasta,
        fuente: 'recomendacion',
        producto_id: recommendation.product_id,
        recomendacion_id: recommendation.id,
        creado_por: recommendation.user_id
      });
    }

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

  /**
   * Historial paginado de todas las recomendaciones (decisiones tomadas),
   * con filtros opcionales por estado y tipo.
   */
  async getRecommendationHistory(params: {
    pagina?: number;
    limite?: number;
    estado?: string;
    tipo?: string;
  }): Promise<{
    items: Recommendation[];
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  }> {
    const pagina = Math.max(1, Number(params.pagina) || 1);
    const limite = Math.min(50, Math.max(1, Number(params.limite) || 10));

    const where: any = {};
    if (params.estado) {
      where.estado = params.estado;
    }
    if (params.tipo) {
      where.tipo = params.tipo;
    }

    const { count, rows } = await Recommendation.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'codigo', 'nombre'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'nombre'] },
        { model: User, as: 'user', attributes: ['id', 'nombre', 'email'] },
        { model: Alert, as: 'alert', attributes: ['id', 'type', 'resolved'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limite,
      offset: (pagina - 1) * limite
    });

    return {
      items: rows,
      total: count,
      pagina,
      limite,
      totalPaginas: Math.ceil(count / limite)
    };
  }

  /**
   * Reabre (revierte) una recomendación ya decidida:
   * - Estado vuelve a PENDIENTE.
   * - Si era PROMOCION aceptada que aplicó descuento al producto, se revierte.
   * - Si estaba ligada a una alerta, la alerta vuelve a estar activa.
   */
  async reopenRecommendation(id: number): Promise<Recommendation> {
    const recommendation = await Recommendation.findByPk(id);
    if (!recommendation) throw new Error('Recomendación no encontrada');
    if (recommendation.estado === 'PENDIENTE') {
      throw new Error('La recomendación ya está pendiente');
    }

    // Revertir efecto de promoción aplicada al producto
    if (recommendation.tipo === 'PROMOCION') {
      await Product.update(
        { descuento_promocion: null, promocion_hasta: null } as any,
        { where: { id: recommendation.product_id } }
      );
      // Eliminar el registro de descuento de recomendación asociado
      await Descuento.destroy({
        where: { producto_id: recommendation.product_id, fuente: 'recomendacion' }
      });
    }

    recommendation.estado = 'PENDIENTE';
    await recommendation.save();

    if (recommendation.alert_id) {
      await Alert.update({ resolved: false }, { where: { id: recommendation.alert_id } });
    }

    return recommendation;
  }

  /**
   * Métricas de historial de decisiones (Fase 4.2): aceptadas vs rechazadas
   * y precisión del motor como métrica de confiabilidad.
   */
  async getDecisionMetrics(): Promise<{
    total: number;
    pendientes: number;
    aceptadas: number;
    rechazadas: number;
    ejecutadas: number;
    tasaAceptacion: number;
    tasaRechazo: number;
    precision: number;
  }> {
    const [total, pendientes, aceptadas, rechazadas, ejecutadas] = await Promise.all([
      Recommendation.count(),
      Recommendation.count({ where: { estado: 'PENDIENTE' } }),
      Recommendation.count({ where: { estado: 'ACEPTADA' } }),
      Recommendation.count({ where: { estado: 'RECHAZADA' } }),
      Recommendation.count({ where: { estado: 'EJECUTADA' } })
    ]);

    const decididas = aceptadas + ejecutadas + rechazadas;
    const tasaAceptacion = decididas > 0 ? parseFloat(((aceptadas + ejecutadas) / decididas * 100).toFixed(1)) : 0;
    const tasaRechazo = decididas > 0 ? parseFloat((rechazadas / decididas * 100).toFixed(1)) : 0;
    const precision = total > 0 ? parseFloat(((aceptadas + ejecutadas) / total * 100).toFixed(1)) : 0;

    return {
      total,
      pendientes,
      aceptadas,
      rechazadas,
      ejecutadas,
      tasaAceptacion,
      tasaRechazo,
      precision
    };
  }
}

export const recommendationService = new RecommendationService();
