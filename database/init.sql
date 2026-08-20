-- Script de inicialización de la base de datos para Docker
-- Se ejecuta automáticamente al crear el contenedor postgres por primera vez

-- Las tablas se crean automáticamente mediante Sequelize (sync) al iniciar el backend
-- Este archivo sirve como referencia del esquema esperado

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Índices adicionales de rendimiento (opcional, Sequelize los crea)
-- Se aplican después del primer sync si es necesario

-- Comentario: El seed de usuarios iniciales (gerente/empleado) se ejecuta manualmente:
-- docker compose exec backend npm run db:seed