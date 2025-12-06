import { sequelize } from '../config/database';
import * as models from '../models';
import { QueryTypes } from 'sequelize';

// Tabla para llevar registro de migraciones ejecutadas
const MIGRATIONS_TABLE = 'schema_migrations';

export async function runMigrations() {
  const transaction = await sequelize.transaction();
  
  try {
    // Crear tabla de migraciones si no existe
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "run_on" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )`,
      { transaction }
    );

    // Obtener migraciones ya ejecutadas
    const [results] = await sequelize.query(
      `SELECT name FROM "${MIGRATIONS_TABLE}"`,
      { transaction, type: QueryTypes.SELECT }
    );
    
    const executedMigrations = (results as Array<{name: string}>).map(r => r.name);
    
    // Ejecutar migraciones pendientes
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.name)) {
        console.log(`Ejecutando migración: ${migration.name}`);
        await migration.up(sequelize.getQueryInterface(), transaction);
        
        // Registrar migración
        await sequelize.query(
          `INSERT INTO "${MIGRATIONS_TABLE}" (name) VALUES (:name)`,
          { transaction, replacements: { name: migration.name } }
        );
      }
    }
    
    await transaction.commit();
    console.log('Migraciones completadas exitosamente.');
  } catch (error) {
    await transaction.rollback();
    console.error('Error durante la migración:', error);
    throw error;
  }
}

// Definición de migraciones
const migrations = [
  {
    name: '20231206_initial_schema',
    async up(queryInterface: any, transaction: any) {
      // Esta migración se manejará automáticamente con los modelos
      // ya que usamos sync() en init-db.ts
    }
  }
  // Aquí se pueden agregar más migraciones en el futuro
];

// Si se ejecuta directamente este archivo
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Proceso de migración completado.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error durante la migración:', error);
      process.exit(1);
    });
}
