import { sequelize } from '../config/database';
import * as models from '../models';
import bcrypt from 'bcryptjs';

interface Permisos {
  dashboard: boolean;
  catalogoProductos: boolean;
  operacionesStock: boolean;
  historialKardex: boolean;
  reporteInventario: boolean;
  alertasStock: boolean;
  clientes: boolean;
  sedesAlmacenes: boolean;
  proveedores: boolean;
  unidades: boolean;
  personal: boolean;
  categorias: boolean;
  usuariosAccesos: boolean;
  ajustes: boolean;
}

const PERMISOS_TOTAL: Permisos = {
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

const seed = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🌱 Iniciando seed...');

    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    console.log('🔄 Sincronizando tablas...');
    await sequelize.sync({ force: false });
    console.log('✅ Tablas sincronizadas.');

    const adminExists = await models.User.findOne({
      where: { email: 'gerente@credisa.com' }
    });

    if (!adminExists) {
      await models.User.create({
        usuario: 'gerente',
        nombre: 'Gerente Principal',
        email: 'gerente@credisa.com',
        password: 'gerente123',
        rol: 'gerente',
        activo: true,
        permisos: PERMISOS_TOTAL,
      });
      console.log('✅ Usuario gerente creado: gerente@credisa.com / gerente123');
    } else {
      console.log('ℹ️  Usuario gerente ya existe.');
    }

    await transaction.commit();
    console.log('✨ Seed completado!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

seed();
