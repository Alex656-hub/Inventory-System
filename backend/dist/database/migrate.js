"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const database_1 = require("../config/database");
const sequelize_1 = require("sequelize");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Tabla para llevar registro de migraciones ejecutadas
const MIGRATIONS_TABLE = 'schema_migrations';
// Cargar migraciones dinámicamente desde el directorio de migraciones
async function loadMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();
    const migrations = [];
    for (const file of migrationFiles) {
        const migration = await Promise.resolve(`${path.join(migrationsDir, file)}`).then(s => __importStar(require(s)));
        migrations.push({
            name: path.basename(file, path.extname(file)),
            up: migration.up
        });
    }
    return migrations;
}
async function runMigrations() {
    const transaction = await database_1.sequelize.transaction();
    try {
        // Crear tabla de migraciones si no existe
        await database_1.sequelize.query(`CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "run_on" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )`, { transaction });
        // Obtener migraciones ya ejecutadas
        const results = await database_1.sequelize.query(`SELECT name FROM "${MIGRATIONS_TABLE}"`, { transaction, type: sequelize_1.QueryTypes.SELECT });
        const executedMigrations = results.map(r => r.name);
        const migrations = await loadMigrations();
        // Ejecutar migraciones pendientes
        for (const migration of migrations) {
            if (!executedMigrations.includes(migration.name)) {
                console.log(`Ejecutando migración: ${migration.name}`);
                await migration.up(database_1.sequelize.getQueryInterface(), transaction);
                // Registrar migración
                await database_1.sequelize.query(`INSERT INTO "${MIGRATIONS_TABLE}" (name) VALUES (:name)`, { transaction, replacements: { name: migration.name } });
                console.log(`Migración ${migration.name} completada.`);
            }
        }
        await transaction.commit();
        console.log('Todas las migraciones se han ejecutado exitosamente.');
    }
    catch (error) {
        await transaction.rollback();
        console.error('Error durante la migración:', error);
        throw error;
    }
}
// Definición de migraciones
const migrations = [
    {
        name: '20231206_initial_schema',
        async up(queryInterface, transaction) {
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
