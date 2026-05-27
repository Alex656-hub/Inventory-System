import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

class StockService {
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
}

export default new StockService();
