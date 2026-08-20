import { Op } from 'sequelize';
import { Descuento, Product, Category, User } from '../models';
import { calcularMargenPorcentaje } from '../analytics/services/promotionUtils';

/**
 * Prioridad de fuentes de descuento (menor número = mayor prioridad).
 * recomendacion > masivo > manual. Los campos legacy del producto
 * (descuento_promocion) actúan como manual de menor prioridad.
 */
const PRIORIDAD_FUENTE: Record<string, number> = {
  recomendacion: 0,
  masivo: 1,
  manual: 2
};

export interface ProductoParaDescuento {
  id: number;
  categoria_id?: number;
  descuento_promocion?: number | null;
  promocion_hasta?: Date | string | null;
  precio_compra?: number | null;
  precio_venta?: number | null;
}

export interface DescuentoEfectivo {
  descuento_promocion: number;
  promocion_hasta: Date | string | null;
  fuente: 'recomendacion' | 'masivo' | 'manual' | 'legacy';
}

export type TipoDescuento = 'producto' | 'categoria' | 'todos';

export interface AplicarDescuentoParams {
  tipo: TipoDescuento;
  producto_id?: number;
  categoria_id?: number;
  porcentaje: number;
  fecha_fin?: string | Date | null;
  productos_excluidos?: number[];
}

export interface ProductoVistaPrevia {
  producto_id: number;
  codigo: string;
  nombre: string;
  precio_venta: number;
  margen: number;
  descuentoEfectivo: number;
  limitadoPorMargen: boolean;
}

export interface OmitidoVistaPrevia {
  producto_id: number;
  codigo: string;
  nombre: string;
  motivo: 'recomendacion' | 'inactivo';
}

class DescuentoService {
  /**
   * Resuelve el descuento efectivo para un lote de productos en una sola
   * consulta. Aplica prioridad de fuentes y limita por margen (nunca se
   * vende por debajo del costo).
   */
  async getDescuentosEfectivos(productos: ProductoParaDescuento[]): Promise<Map<number, DescuentoEfectivo>> {
    const resultado = new Map<number, DescuentoEfectivo>();
    if (!productos.length) return resultado;

    const productoIds = productos.map(p => p.id);
    const categoriaIds = [...new Set(productos.map(p => p.categoria_id).filter(Boolean) as number[])];

    const scope: any[] = [{ todos_productos: true }];
    if (productoIds.length) scope.push({ producto_id: { [Op.in]: productoIds } });
    if (categoriaIds.length) scope.push({ categoria_id: { [Op.in]: categoriaIds } });

    const descuentos = await Descuento.findAll({
      where: {
        [Op.or]: scope,
        fecha_fin: { [Op.or]: [{ [Op.gte]: new Date() }, null] }
      }
    });

    for (const producto of productos) {
      const margen = calcularMargenPorcentaje(
        producto.precio_compra ?? null,
        producto.precio_venta ?? null
      );

      const aplicables = descuentos.filter(d => {
        const excluidos = Array.isArray(d.productos_excluidos) ? d.productos_excluidos : [];
        if (excluidos.includes(producto.id)) return false;
        return (
          d.todos_productos ||
          d.producto_id === producto.id ||
          (d.categoria_id != null && d.categoria_id === producto.categoria_id)
        );
      });

      let mejor: Descuento | null = null;
      for (const d of aplicables) {
        if (!mejor) {
          mejor = d;
          continue;
        }
        const pa = PRIORIDAD_FUENTE[mejor.fuente] ?? 99;
        const pb = PRIORIDAD_FUENTE[d.fuente] ?? 99;
        if (pb < pa || (pb === pa && new Date(d.updatedAt) > new Date(mejor.updatedAt))) {
          mejor = d;
        }
      }

      const legacyDesc = Number(producto.descuento_promocion) || 0;
      const baseDesc = mejor ? Number(mejor.porcentaje) : legacyDesc;

      let desc = Math.min(baseDesc, margen);
      if (desc < 0) desc = 0;
      desc = Math.round(desc * 100) / 100;

      resultado.set(producto.id, {
        descuento_promocion: desc,
        promocion_hasta: mejor
          ? (mejor.fecha_fin as Date | string | null)
          : (producto.promocion_hasta ?? null),
        fuente: mejor ? (mejor.fuente as DescuentoEfectivo['fuente']) : 'legacy'
      });
    }

    return resultado;
  }

  /**
   * Lista descuentos con filtros opcionales.
   */
  async listar(filtros: {
    fuente?: string;
    tipo?: TipoDescuento;
    categoria_id?: number;
    activos?: boolean;
  }): Promise<Descuento[]> {
    const where: any = {};

    if (filtros.fuente) where.fuente = filtros.fuente;

    if (filtros.tipo === 'producto') {
      where.producto_id = { [Op.ne]: null };
      where.todos_productos = false;
    } else if (filtros.tipo === 'categoria') {
      where.categoria_id = { [Op.ne]: null };
      where.todos_productos = false;
    } else if (filtros.tipo === 'todos') {
      where.todos_productos = true;
    }

    if (filtros.categoria_id) where.categoria_id = filtros.categoria_id;

    if (filtros.activos) {
      where.fecha_fin = { [Op.or]: [{ [Op.gte]: new Date() }, null] };
    }

    return Descuento.findAll({
      where,
      include: [
        { model: Product, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
        { model: Category, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: User, as: 'creador', attributes: ['id', 'nombre'] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Valida y normaliza la fecha de vigencia de un descuento.
   * Retorna null si no se especificó; lanza error si es inválida o pasada.
   */
  private validarVigencia(fechaFinRaw?: string | Date | null): Date | null {
    if (!fechaFinRaw) return null;
    const fechaFin = new Date(fechaFinRaw);
    if (isNaN(fechaFin.getTime())) throw new Error('Fecha de vigencia inválida');
    if (fechaFin < new Date()) throw new Error('La fecha de vigencia no puede estar en el pasado');
    return fechaFin;
  }

  /**
   * Determina los productos objetivo de un descuento según su alcance.
   */
  private async getProductosObjetivo(tipo: TipoDescuento, params: { producto_id?: number; categoria_id?: number }): Promise<Product[]> {
    if (tipo === 'producto') {
      if (!params.producto_id) throw new Error('Se requiere producto_id para descuento por producto');
      const producto = await Product.findOne({ where: { id: params.producto_id, activo: true } });
      if (!producto) throw new Error('Producto no encontrado o inactivo');
      return [producto];
    }

    if (tipo === 'categoria') {
      if (!params.categoria_id) throw new Error('Se requiere categoria_id para descuento por categoría');
      return Product.findAll({
        where: { categoria_id: params.categoria_id, activo: true }
      });
    }

    return Product.findAll({ where: { activo: true } });
  }

  /**
   * Indica si el producto tiene un descuento de recomendación vigente.
   */
  async tieneDescuentoRecomendacion(productoId: number): Promise<boolean> {
    const encontrado = await Descuento.findOne({
      where: {
        producto_id: productoId,
        fuente: 'recomendacion',
        fecha_fin: { [Op.or]: [{ [Op.gte]: new Date() }, null] }
      }
    });
    return !!encontrado;
  }

  /**
   * Normaliza la lista de ids de productos excluidos: enteros positivos y sin duplicados.
   */
  private normalizarExcluidos(raw?: number[]): number[] {
    return [...new Set((raw || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  }

  /**
   * Vista previa: calcula qué productos serían afectados/omitidos/excluidos y el
   * descuento efectivo del lote (limitado por el margen mínimo de los no excluidos).
   */
  async vistaPrevia(params: AplicarDescuentoParams): Promise<{
    afectados: ProductoVistaPrevia[];
    omitidos: OmitidoVistaPrevia[];
    excluidos: ProductoVistaPrevia[];
    descuentoEfectivoLote: number;
    porcentajeSolicitado: number;
  }> {
    const porcentaje = Number(params.porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      throw new Error('Porcentaje inválido: debe estar entre 1 y 100');
    }

    this.validarVigencia(params.fecha_fin);

    const excluidosIds = this.normalizarExcluidos(params.productos_excluidos);

    const productos = await this.getProductosObjetivo(params.tipo, params);

    const afectados: ProductoVistaPrevia[] = [];
    const omitidos: OmitidoVistaPrevia[] = [];
    const excluidos: ProductoVistaPrevia[] = [];
    let margenMinimo = Infinity;

    for (const p of productos) {
      if (await this.tieneDescuentoRecomendacion(p.id)) {
        omitidos.push({
          producto_id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          motivo: 'recomendacion'
        });
        continue;
      }

      const margen = calcularMargenPorcentaje(p.precio_compra, p.precio_venta);
      const descuentoEfectivo = Math.min(porcentaje, margen);
      const vista: ProductoVistaPrevia = {
        producto_id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        precio_venta: Number(p.precio_venta) || 0,
        margen,
        descuentoEfectivo: Math.round(descuentoEfectivo * 100) / 100,
        limitadoPorMargen: descuentoEfectivo < porcentaje
      };

      if (excluidosIds.includes(p.id)) {
        excluidos.push(vista);
        continue;
      }

      margenMinimo = Math.min(margenMinimo, margen);
      afectados.push(vista);
    }

    const descuentoEfectivoLote = Number.isFinite(margenMinimo)
      ? Math.round(Math.min(porcentaje, margenMinimo) * 100) / 100
      : 0;

    return {
      afectados,
      omitidos,
      excluidos,
      descuentoEfectivoLote,
      porcentajeSolicitado: porcentaje
    };
  }

  /**
   * Aplica un descuento (por producto/categoría/todos). Respeta:
   * - Descuentos de recomendación vigentes (se omiten).
   * - Margen de ganancia (se limita al margen mínimo del lote).
   */
  async aplicar(params: AplicarDescuentoParams, usuarioId: number): Promise<{
    tipo: TipoDescuento;
    descuentoAplicado: number;
    productosAfectados: number;
    omitidos: number;
    excluidos: number;
  }> {
    const previa = await this.vistaPrevia(params);

    if (previa.afectados.length === 0) {
      throw new Error('No hay productos elegibles para el descuento');
    }

    if (previa.descuentoEfectivoLote <= 0) {
      throw new Error('El descuento supera el margen de ganancia de todos los productos afectados');
    }

    const fechaInicio = new Date();
    const fechaFin = this.validarVigencia(params.fecha_fin);
    const excluidosIds = previa.excluidos.map(e => e.producto_id);

    if (params.tipo === 'producto') {
      const [registro] = await Descuento.findOrCreate({
        where: { producto_id: params.producto_id!, fuente: 'manual' },
        defaults: {
          porcentaje: previa.descuentoEfectivoLote,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          fuente: 'manual',
          producto_id: params.producto_id,
          creado_por: usuarioId,
          productos_excluidos: excluidosIds
        }
      });
      registro.porcentaje = previa.descuentoEfectivoLote;
      registro.fecha_fin = fechaFin;
      registro.creado_por = usuarioId;
      registro.productos_excluidos = excluidosIds;
      await registro.save();
    } else if (params.tipo === 'categoria') {
      const [registro] = await Descuento.findOrCreate({
        where: { categoria_id: params.categoria_id!, fuente: 'masivo', todos_productos: false },
        defaults: {
          porcentaje: previa.descuentoEfectivoLote,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          fuente: 'masivo',
          categoria_id: params.categoria_id,
          creado_por: usuarioId,
          productos_excluidos: excluidosIds
        }
      });
      registro.porcentaje = previa.descuentoEfectivoLote;
      registro.fecha_fin = fechaFin;
      registro.creado_por = usuarioId;
      registro.productos_excluidos = excluidosIds;
      await registro.save();
    } else {
      const [registro] = await Descuento.findOrCreate({
        where: { todos_productos: true, fuente: 'masivo' },
        defaults: {
          porcentaje: previa.descuentoEfectivoLote,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          fuente: 'masivo',
          todos_productos: true,
          creado_por: usuarioId,
          productos_excluidos: excluidosIds
        }
      });
      registro.porcentaje = previa.descuentoEfectivoLote;
      registro.fecha_fin = fechaFin;
      registro.creado_por = usuarioId;
      registro.productos_excluidos = excluidosIds;
      await registro.save();
    }

    return {
      tipo: params.tipo,
      descuentoAplicado: previa.descuentoEfectivoLote,
      productosAfectados: previa.afectados.length,
      omitidos: previa.omitidos.length,
      excluidos: previa.excluidos.length
    };
  }

  /**
   * Revertir un descuento individual. Los descuentos de recomendación se
   * gestionan desde el módulo de Recomendaciones.
   */
  async revertir(id: number): Promise<Descuento> {
    const registro = await Descuento.findByPk(id);
    if (!registro) throw new Error('Descuento no encontrado');

    if (registro.fuente === 'recomendacion') {
      throw new Error('Este descuento proviene de una recomendación. Revértelo desde el módulo de Alertas / Recomendaciones');
    }

    await registro.destroy();
    return registro;
  }

  /**
   * Revertir en lote: todos los descuentos masivos de una categoría o los
   * globales (todos los productos). Nunca toca descuentos de recomendación.
   */
  async revertirMasivo(params: { tipo: TipoDescuento; categoria_id?: number }): Promise<number> {
    const where: any = { fuente: 'masivo' };

    if (params.tipo === 'categoria') {
      if (!params.categoria_id) throw new Error('Se requiere categoria_id');
      where.categoria_id = params.categoria_id;
      where.todos_productos = false;
    } else if (params.tipo === 'todos') {
      where.todos_productos = true;
    } else {
      throw new Error('La reversión masiva aplica solo a categorías o a todos los productos');
    }

    return Descuento.destroy({ where });
  }
}

export const descuentoService = new DescuentoService();