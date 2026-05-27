const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'credisa_inventory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const permisosGerente = {
  dashboard: true,
  catalogoProductos: true,
  operacionesStock: true,
  historialKardex: true,
  reporteInventario: true,
  alertasStock: true,
  clientes: true,
  sedesAlmacenes: true,
  proveedores: true,
  unidades: true,
  personal: true,
  categorias: true,
  usuariosAccesos: true,
  ajustes: true,
};

const permisosEmpleado = {
  dashboard: true,
  catalogoProductos: true,
  operacionesStock: true,
  historialKardex: true,
  reporteInventario: true,
  alertasStock: true,
  clientes: true,
  sedesAlmacenes: false,
  proveedores: false,
  unidades: true,
  personal: false,
  categorias: true,
  usuariosAccesos: false,
  ajustes: false,
};

(async () => {
  try {
    await pool.query(
      `UPDATE usuarios SET permisos = $1 WHERE email = 'gerente@credisa.com'`,
      [JSON.stringify(permisosGerente)]
    );
    console.log('✅ Gerente actualizado');

    await pool.query(
      `UPDATE usuarios SET permisos = $1 WHERE email = 'empleado@credisa.com'`,
      [JSON.stringify(permisosEmpleado)]
    );
    console.log('✅ Empleado actualizado');

    await pool.end();
    console.log('✅ Todos los permisos migrados');
  } catch (err) {
    console.error('❌ Error:', err.message);
    pool.end();
  }
})();
