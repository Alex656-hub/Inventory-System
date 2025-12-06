import { sequelize } from '../config/database';
import * as models from '../models';
import bcrypt from 'bcryptjs';

interface SeedData {
  users: Array<{
    nombre: string;
    email: string;
    password: string;
    rol: 'gerente' | 'empleado';
    activo: boolean;
  }>;
  categories: Array<{
    nombre: string;
    descripcion: string;
  }>;
  suppliers: Array<{
    nombre: string;
    ruc_dni: string;
    contacto_telefono: string;
    contacto_email: string;
    direccion: string;
  }>;
}

const seedData: SeedData = {
  users: [
    {
      nombre: 'Gerente Principal',
      email: 'gerente@credisa.com',
      password: 'gerente123',
      rol: 'gerente',
      activo: true
    },
    {
      nombre: 'Empleado Ejemplo',
      email: 'empleado@credisa.com',
      password: 'empleado123',
      rol: 'empleado',
      activo: true
    }
  ],
  categories: [
    { nombre: 'Electrodomésticos', descripcion: 'Productos electrodomésticos' },
    { nombre: 'Tecnología', descripcion: 'Dispositivos electrónicos y accesorios' },
    { nombre: 'Hogar', descripcion: 'Artículos para el hogar' },
    { nombre: 'Oficina', descripcion: 'Suministros de oficina' },
    { nombre: 'Limpieza', descripcion: 'Productos de limpieza' },
    { nombre: 'Alimentos y Bebidas', descripcion: 'Productos alimenticios' }
  ],
  suppliers: [
    {
      nombre: 'Distribuidora del Norte S.A.',
      ruc_dni: '20123456789',
      contacto_telefono: '041-123456',
      contacto_email: 'contacto@distribuidora.com',
      direccion: 'Av. Principal 123, Bagua'
    },
    {
      nombre: 'Proveedor Sur E.I.R.L.',
      ruc_dni: '20234567890',
      contacto_telefono: '041-234567',
      contacto_email: 'info@proveedor.com',
      direccion: 'Jr. Comercio 456, Bagua'
    }
  ]
};

const seed = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🌱 Iniciando seed de datos iniciales...');

    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // Sincronizar modelos (crear tablas si no existen)
    console.log('🔄 Creando tablas en la base de datos...');
    await sequelize.sync({ force: false });
    console.log('✅ Tablas creadas/sincronizadas correctamente.');

    // Crear usuarios
    console.log('👥 Creando usuarios de prueba...');
    for (const userData of seedData.users) {
      const userExists = await models.User.findOne({
        where: { email: userData.email }
      });

      if (!userExists) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await models.User.create({
          ...userData,
          password: hashedPassword
        });
        console.log(`✅ Usuario creado: ${userData.email} / ${userData.password}`);
      } else {
        console.log(`ℹ️  Usuario ya existe: ${userData.email}`);
      }
    }

    // Crear categorías
    console.log('🏷️  Creando categorías...');
    for (const categoryData of seedData.categories) {
      const [category] = await models.Category.findOrCreate({
        where: { nombre: categoryData.nombre },
        defaults: categoryData
      });
      console.log(`✅ Categoría procesada: ${category.nombre}`);
    }

    // Crear proveedores
    console.log('🏢 Creando proveedores...');
    for (const supplierData of seedData.suppliers) {
      const [supplier] = await models.Supplier.findOrCreate({
        where: { ruc_dni: supplierData.ruc_dni },
        defaults: supplierData
      });
      console.log(`✅ Proveedor procesado: ${supplier.nombre}`);
    }

    await transaction.commit();
    console.log('✨ Seed completado exitosamente!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

seed();
