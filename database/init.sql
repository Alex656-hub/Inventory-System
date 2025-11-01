-- Script de inicialización de la base de datos
-- Ejecutar este script después de crear la base de datos PostgreSQL

-- Crear base de datos (ejecutar manualmente si no existe)
-- CREATE DATABASE credisa_inventory;

-- Las tablas se crearán automáticamente mediante Sequelize
-- Este archivo es solo para referencia

-- Para crear un usuario gerente inicial después de ejecutar la aplicación:
-- INSERT INTO usuarios (nombre, email, password, rol, activo, "createdAt", "updatedAt")
-- VALUES ('Administrador', 'admin@credisa.com', '$2a$10$[hash_de_bcrypt]', 'gerente', true, NOW(), NOW());

