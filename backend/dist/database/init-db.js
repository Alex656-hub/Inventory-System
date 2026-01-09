"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const database_1 = require("../config/database");
async function initializeDatabase(force = false) {
    try {
        // Autenticar la conexión a la base de datos
        await database_1.sequelize.authenticate();
        console.log('Conexión a la base de datos establecida correctamente.');
        // Sincronizar todos los modelos
        await database_1.sequelize.sync({ force });
        if (force) {
            console.log('Base de datos recreada exitosamente.');
        }
        else {
            console.log('Modelos sincronizados correctamente.');
        }
        return true;
    }
    catch (error) {
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
