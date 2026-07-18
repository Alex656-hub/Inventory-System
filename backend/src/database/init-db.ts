import { sequelize } from '../config/database';
import '../models';
import { ensureProductosProveedorOptional } from './ensure-schema-patches';

export async function initializeDatabase(force = false) {
  try {
    // Autenticar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Sincronizar todos los modelos.
    // En entornos locales, usamos alter para incorporar columnas nuevas sin destruir datos.
    await sequelize.sync({ force, alter: !force });
    await ensureProductosProveedorOptional();

    if (force) {
      console.log('Base de datos recreada exitosamente.');
    } else {
      console.log('Modelos sincronizados correctamente.');
    }

    return true;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

// Si se ejecuta directamente este archivo
if (require.main === module) {
  const force = process.argv.includes('--force');
  initializeDatabase(force)
    .then(() => {
      console.log('Inicialización completada.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error durante la inicialización:', error);
      process.exit(1);
    });
}
