"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const Category_1 = __importDefault(require("../models/Category"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const database_1 = require("../config/database");
const seed = async () => {
    try {
        console.log('🌱 Iniciando seed de datos iniciales...');
        await database_1.sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida.');
        // Sincronizar modelos (crear tablas si no existen)
        console.log('🔄 Creando tablas en la base de datos...');
        await database_1.sequelize.sync({ alter: false });
        console.log('✅ Tablas creadas/sincronizadas correctamente.');
        // Crear usuario gerente inicial
        const gerenteExistente = await User_1.default.findOne({ where: { email: 'gerente@credisa.com' } });
        if (!gerenteExistente) {
            await User_1.default.create({
                nombre: 'Gerente Principal',
                email: 'gerente@credisa.com',
                password: 'gerente123', // Se hasheará automáticamente
                rol: 'gerente',
                activo: true
            });
            console.log('✅ Usuario gerente creado: gerente@credisa.com / gerente123');
        }
        else {
            console.log('ℹ️  Usuario gerente ya existe.');
        }
        // Crear usuario empleado inicial
        const empleadoExistente = await User_1.default.findOne({ where: { email: 'empleado@credisa.com' } });
        if (!empleadoExistente) {
            await User_1.default.create({
                nombre: 'Empleado Ejemplo',
                email: 'empleado@credisa.com',
                password: 'empleado123', // Se hasheará automáticamente
                rol: 'empleado',
                activo: true
            });
            console.log('✅ Usuario empleado creado: empleado@credisa.com / empleado123');
        }
        else {
            console.log('ℹ️  Usuario empleado ya existe.');
        }
        // Crear categorías de ejemplo
        const categoriasEjemplo = [
            { nombre: 'Electrodomésticos', descripcion: 'Productos electrodomésticos' },
            { nombre: 'Tecnología', descripcion: 'Productos tecnológicos' },
            { nombre: 'Hogar y Muebles', descripcion: 'Artículos para el hogar' },
            { nombre: 'Alimentos y Bebidas', descripcion: 'Productos alimenticios' }
        ];
        for (const cat of categoriasEjemplo) {
            const existe = await Category_1.default.findOne({ where: { nombre: cat.nombre } });
            if (!existe) {
                await Category_1.default.create(cat);
                console.log(`✅ Categoría creada: ${cat.nombre}`);
            }
        }
        // Crear proveedores de ejemplo
        const proveedoresEjemplo = [
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
        ];
        for (const prov of proveedoresEjemplo) {
            const existe = await Supplier_1.default.findOne({ where: { ruc_dni: prov.ruc_dni } });
            if (!existe) {
                await Supplier_1.default.create(prov);
                console.log(`✅ Proveedor creado: ${prov.nombre}`);
            }
        }
        console.log('✅ Seed completado exitosamente.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
};
seed();
