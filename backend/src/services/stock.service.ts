import StockPorSede from '../models/StockPorSede';
import Product from '../models/Product';
import Sede from '../models/Sede';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

interface StockDisponible {
  producto_id: number;
  producto_nombre: string;
  sede_id: number;
  sede_nombre: string;
  cantidad_actual: number;
  stock_minimo: number;
  estado_stock: 'SUFICIENTE' | 'BAJO' | 'AGOTADO';
}

interface MovimientoStock {
  producto_id: number;
  producto_nombre: string;
  sede_origen_id: number;
  sede_origen_nombre: string;
  sede_destino_id: number;
  sede_destino_nombre: string;
  cantidad: number;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  fecha: Date;
  responsable: string;
}

class StockService {
  // Obtener stock disponible de un producto en todas las sedes
  async obtenerStockPorProducto(productoId: number): Promise<StockDisponible[]> {
    const query = `
      SELECT 
        sps.producto_id,
        p.nombre as producto_nombre,
        sps.sede_id,
        s.nombre as sede_nombre,
        COALESCE(sps.cantidad_actual, 0) as cantidad_actual,
        COALESCE(sps.stock_minimo, 0) as stock_minimo,
        CASE 
          WHEN COALESCE(sps.cantidad_actual, 0) = 0 THEN 'AGOTADO'
          WHEN COALESCE(sps.cantidad_actual, 0) <= COALESCE(sps.stock_minimo, 0) THEN 'BAJO'
          ELSE 'SUFICIENTE'
        END as estado_stock
      FROM productos p
      CROSS JOIN sedes s
      LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND s.id = sps.sede_id
      WHERE p.id = :productoId AND s.estado = 'activo'
      ORDER BY s.nombre;
    `;

    const resultados = await sequelize.query(query, {
      replacements: { productoId },
      type: QueryTypes.SELECT
    });

    return resultados as StockDisponible[];
  }

  // Obtener stock disponible de todos los productos en una sede
  async obtenerStockPorSede(sedeId: number): Promise<StockDisponible[]> {
    const query = `
      SELECT 
        sps.producto_id,
        p.nombre as producto_nombre,
        sps.sede_id,
        s.nombre as sede_nombre,
        COALESCE(sps.cantidad_actual, 0) as cantidad_actual,
        COALESCE(sps.stock_minimo, 0) as stock_minimo,
        CASE 
          WHEN COALESCE(sps.cantidad_actual, 0) = 0 THEN 'AGOTADO'
          WHEN COALESCE(sps.cantidad_actual, 0) <= COALESCE(sps.stock_minimo, 0) THEN 'BAJO'
          ELSE 'SUFICIENTE'
        END as estado_stock
      FROM productos p
      CROSS JOIN sedes s
      LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND s.id = sps.sede_id
      WHERE s.id = :sedeId AND s.estado = 'activo' AND p.activo = true
      ORDER BY p.nombre;
    `;

    const resultados = await sequelize.query(query, {
      replacements: { sedeId },
      type: QueryTypes.SELECT
    });

    return resultados as StockDisponible[];
  }

  // Obtener stock general de todos los productos en todas las sedes
  async obtenerStockGeneral(): Promise<StockDisponible[]> {
    const query = `
      SELECT 
        sps.producto_id,
        p.nombre as producto_nombre,
        sps.sede_id,
        s.nombre as sede_nombre,
        COALESCE(sps.cantidad_actual, 0) as cantidad_actual,
        COALESCE(sps.stock_minimo, 0) as stock_minimo,
        CASE 
          WHEN COALESCE(sps.cantidad_actual, 0) = 0 THEN 'AGOTADO'
          WHEN COALESCE(sps.cantidad_actual, 0) <= COALESCE(sps.stock_minimo, 0) THEN 'BAJO'
          ELSE 'SUFICIENTE'
        END as estado_stock
      FROM productos p
      CROSS JOIN sedes s
      LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND s.id = sps.sede_id
      WHERE s.estado = 'activo' AND p.activo = true
      ORDER BY s.nombre, p.nombre;
    `;

    const resultados = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    return resultados as StockDisponible[];
  }

  // Obtener productos con stock bajo
  async obtenerProductosStockBajo(sedeId?: number): Promise<StockDisponible[]> {
    let whereClause = '';
    let replacements: any = {};

    if (sedeId) {
      whereClause = 'AND s.id = :sedeId';
      replacements.sedeId = sedeId;
    }

    const query = `
      SELECT 
        sps.producto_id,
        p.nombre as producto_nombre,
        sps.sede_id,
        s.nombre as sede_nombre,
        COALESCE(sps.cantidad_actual, 0) as cantidad_actual,
        COALESCE(sps.stock_minimo, 0) as stock_minimo,
        'BAJO' as estado_stock
      FROM productos p
      CROSS JOIN sedes s
      LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND s.id = sps.sede_id
      WHERE s.estado = 'activo' AND p.activo = true ${whereClause}
        AND COALESCE(sps.cantidad_actual, 0) > 0 
        AND COALESCE(sps.cantidad_actual, 0) <= COALESCE(sps.stock_minimo, 0)
      ORDER BY s.nombre, p.nombre;
    `;

    const resultados = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return resultados as StockDisponible[];
  }

  // Obtener productos agotados
  async obtenerProductosAgotados(sedeId?: number): Promise<StockDisponible[]> {
    let whereClause = '';
    let replacements: any = {};

    if (sedeId) {
      whereClause = 'AND s.id = :sedeId';
      replacements.sedeId = sedeId;
    }

    const query = `
      SELECT 
        sps.producto_id,
        p.nombre as producto_nombre,
        sps.sede_id,
        s.nombre as sede_nombre,
        0 as cantidad_actual,
        COALESCE(sps.stock_minimo, 0) as stock_minimo,
        'AGOTADO' as estado_stock
      FROM productos p
      CROSS JOIN sedes s
      LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND s.id = sps.sede_id
      WHERE s.estado = 'activo' AND p.activo = true ${whereClause}
        AND COALESCE(sps.cantidad_actual, 0) = 0
      ORDER BY s.nombre, p.nombre;
    `;

    const resultados = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return resultados as StockDisponible[];
  }

  // Buscar productos por nombre o código para selección en operaciones
  async buscarProductosParaOperacion(termino: string, sedeId?: number): Promise<any[]> {
    let whereClause = '';
    let replacements: any = { termino: `%${termino}%` };

    if (sedeId) {
      whereClause = 'AND s.id = :sedeId';
      replacements.sedeId = sedeId;
    }

    const query = `
      SELECT DISTINCT
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.precio_compra,
        p.precio_venta,
        p.unidad_id,
        um.nombre as unidad_nombre,
        c.nombre as categoria_nombre,
        COALESCE(sps.cantidad_actual, 0) as stock_disponible,
        COALESCE(sps.stock_minimo, 0) as stock_minimo
      FROM productos p
      LEFT JOIN unidades_medida um ON p.unidad_id = um.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      CROSS JOIN sedes s
      LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND s.id = sps.sede_id
      WHERE p.activo = true AND s.estado = 'activo' ${whereClause}
        AND (p.codigo ILIKE :termino OR p.nombre ILIKE :termino)
      ORDER BY p.nombre
      LIMIT 50;
    `;

    const resultados = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return resultados;
  }

  // Validar stock disponible antes de una operación
  async validarStockDisponible(productoId: number, sedeId: number, cantidadRequerida: number): Promise<boolean> {
    const stock = await StockPorSede.findOne({
      where: {
        producto_id: productoId,
        sede_id: sedeId
      }
    });

    if (!stock) {
      return false; // No existe registro de stock
    }

    return stock.cantidad_actual >= cantidadRequerida;
  }

  // Obtener histórico de movimientos de un producto
  async obtenerHistoricoMovimientos(productoId: number, limite: number = 100): Promise<MovimientoStock[]> {
    const query = `
      SELECT 
        mi.producto_id,
        p.nombre as producto_nombre,
        os.sede_origen_id,
        so.nombre as sede_origen_nombre,
        os.sede_destino_id,
        sd.nombre as sede_destino_nombre,
        mi.cantidad,
        mi.tipo_movimiento,
        mi.fecha,
        u.nombre as responsable
      FROM movimientos_inventario mi
      JOIN productos p ON mi.producto_id = p.id
      JOIN usuarios u ON mi.usuario_id = u.id
      LEFT JOIN operaciones_stock os ON mi.referencia_id = os.id AND mi.tipo_referencia = 'operacion_stock'
      LEFT JOIN sedes so ON os.sede_origen_id = so.id
      LEFT JOIN sedes sd ON os.sede_destino_id = sd.id
      WHERE mi.producto_id = :productoId
      ORDER BY mi.fecha DESC
      LIMIT :limite;
    `;

    const resultados = await sequelize.query(query, {
      replacements: { productoId, limite },
      type: QueryTypes.SELECT
    });

    return resultados as MovimientoStock[];
  }
}

export default new StockService();
