const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'credisa_inventory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

(async () => {
  try {
    const defaultSede = await pool.query(
      `SELECT id FROM sedes WHERE estado = 'activo' ORDER BY id LIMIT 1`
    );

    if (defaultSede.rows.length === 0) {
      console.error('❌ No hay sedes activas. Crea una sede primero.');
      await pool.end();
      return;
    }

    const sedeId = defaultSede.rows[0].id;
    console.log(`📍 Usando sede por defecto: ID ${sedeId}`);

    const productos = await pool.query(
      `SELECT id, codigo, nombre, stock_actual FROM productos WHERE activo = true AND stock_actual > 0`
    );

    console.log(`📦 ${productos.rows.length} productos con stock > 0 encontrados`);

    let creados = 0;
    let actualizados = 0;

    for (const producto of productos.rows) {
      const existente = await pool.query(
        `SELECT id, cantidad_actual FROM stock_por_sede WHERE producto_id = $1 AND sede_id = $2`,
        [producto.id, sedeId]
      );

      if (existente.rows.length === 0) {
        await pool.query(
          `INSERT INTO stock_por_sede (producto_id, sede_id, cantidad_actual, stock_minimo, ultimo_movimiento, created_at, updated_at)
           VALUES ($1, $2, $3, 0, NOW(), NOW(), NOW())`,
          [producto.id, sedeId, producto.stock_actual]
        );
        console.log(`✅ Creado: ${producto.codigo} - ${producto.nombre} (stock: ${producto.stock_actual})`);
        creados++;
      } else if (existente.rows[0].cantidad_actual < producto.stock_actual) {
        await pool.query(
          `UPDATE stock_por_sede SET cantidad_actual = $1, updated_at = NOW() WHERE id = $2`,
          [producto.stock_actual, existente.rows[0].id]
        );
        console.log(`📈 Actualizado: ${producto.codigo} - ${producto.nombre} (${existente.rows[0].cantidad_actual} → ${producto.stock_actual})`);
        actualizados++;
      }
    }

    console.log(`\n✨ Sincronización completada: ${creados} creados, ${actualizados} actualizados`);
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
  }
})();
