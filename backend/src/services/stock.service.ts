import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

class StockService {
  // Buscar productos por nombre o código para selección en operaciones
  async buscarProductosParaOperacion(termino: string, sedeId?: number): Promise<any[]> {
    let sedeJoin = '';
    let sedeCondition = '';
    let replacements: any = { termino: `%${termino}%` };

    if (sedeId) {
      sedeJoin = 'LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id AND sps.sede_id = :sedeId';
      sedeCondition = 'WHERE p.activo = true';
      replacements.sedeId = sedeId;
    } else {
      sedeJoin = 'LEFT JOIN stock_por_sede sps ON p.id = sps.producto_id';
      sedeCondition = 'WHERE p.activo = true';
    }

    const query = `
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.precio_compra,
        p.precio_venta,
        p.unidad_id,
        um.nombre as unidad_nombre,
        c.nombre as categoria_nombre,
        COALESCE(SUM(sps.cantidad_actual), 0) as stock_disponible,
        COALESCE(MIN(sps.stock_minimo), 0) as stock_minimo
      FROM productos p
      LEFT JOIN unidades_medida um ON p.unidad_id = um.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ${sedeJoin}
      ${sedeCondition}
        AND (p.codigo ILIKE :termino OR p.nombre ILIKE :termino)
      GROUP BY p.id, p.codigo, p.nombre, p.descripcion, p.precio_compra, p.precio_venta, p.unidad_id, um.nombre, c.nombre
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
