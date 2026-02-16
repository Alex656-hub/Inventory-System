"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSearch = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const SalidaInventario_1 = __importDefault(require("../models/SalidaInventario"));
const sequelize_1 = require("sequelize");
const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;
        const limitPerType = Number(req.query.limitPerType) || 5;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'El parámetro query es obligatorio y no puede estar vacío'
            });
            return;
        }
        const searchTerm = `%${query.trim()}%`;
        // Buscar productos
        const productos = await Product_1.default.findAll({
            where: {
                activo: true,
                [sequelize_1.Op.or]: [
                    { codigo: { [sequelize_1.Op.iLike]: searchTerm } },
                    { nombre: { [sequelize_1.Op.iLike]: searchTerm } },
                    { descripcion: { [sequelize_1.Op.iLike]: searchTerm } }
                ]
            },
            include: [
                { model: Category_1.default, as: 'categoria', attributes: ['id', 'nombre'] }
            ],
            limit: limitPerType,
            order: [['nombre', 'ASC']]
        });
        // Buscar ventas (salidas de inventario)
        const ventas = await SalidaInventario_1.default.findAll({
            where: {
                estado: 'completado',
                [sequelize_1.Op.or]: [
                    { numero_documento: { [sequelize_1.Op.iLike]: searchTerm } },
                    { cliente_nombre: { [sequelize_1.Op.iLike]: searchTerm } },
                    { cliente_documento: { [sequelize_1.Op.iLike]: searchTerm } },
                    { observaciones: { [sequelize_1.Op.iLike]: searchTerm } }
                ]
            },
            limit: limitPerType,
            order: [['fecha', 'DESC']]
        });
        // Buscar categorías
        const categorias = await Category_1.default.findAll({
            where: {
                activa: true,
                [sequelize_1.Op.or]: [
                    { nombre: { [sequelize_1.Op.iLike]: searchTerm } },
                    { descripcion: { [sequelize_1.Op.iLike]: searchTerm } }
                ]
            },
            limit: limitPerType,
            order: [['nombre', 'ASC']]
        });
        // Buscar proveedores
        const proveedores = await Supplier_1.default.findAll({
            where: {
                activo: true,
                [sequelize_1.Op.or]: [
                    { nombre: { [sequelize_1.Op.iLike]: searchTerm } },
                    { ruc_dni: { [sequelize_1.Op.iLike]: searchTerm } },
                    { contacto_telefono: { [sequelize_1.Op.iLike]: searchTerm } },
                    { contacto_email: { [sequelize_1.Op.iLike]: searchTerm } },
                    { direccion: { [sequelize_1.Op.iLike]: searchTerm } }
                ]
            },
            limit: limitPerType,
            order: [['nombre', 'ASC']]
        });
        // Construir respuesta
        const response = {
            productos: productos.map(producto => ({
                id: producto.id,
                codigo: producto.codigo,
                nombre: producto.nombre,
                categoria: producto.categoria ? {
                    id: producto.categoria.id,
                    nombre: producto.categoria.nombre
                } : undefined,
                resumen: `Stock: ${producto.stock_actual}, Precio: S/ ${producto.precio_venta}`
            })),
            ventas: ventas.map(venta => ({
                id: venta.id,
                numero: venta.numero_documento,
                fecha: venta.fecha.toISOString().split('T')[0],
                total: venta.total,
                resumen: venta.cliente_nombre ? `Cliente: ${venta.cliente_nombre}` : (venta.observaciones || 'Sin nota')
            })),
            categorias: categorias.map(categoria => ({
                id: categoria.id,
                nombre: categoria.nombre,
                resumen: categoria.descripcion || 'Sin descripción'
            })),
            proveedores: proveedores.map(proveedor => ({
                id: proveedor.id,
                nombre: proveedor.nombre,
                ruc_dni: proveedor.ruc_dni,
                resumen: proveedor.contacto_telefono ? `Tel: ${proveedor.contacto_telefono}` : (proveedor.direccion || 'Sin información de contacto')
            }))
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error en búsqueda global:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.globalSearch = globalSearch;
