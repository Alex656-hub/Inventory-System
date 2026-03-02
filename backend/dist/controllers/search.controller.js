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
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum cache entries
const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;
        const limitPerType = Number(req.query.limitPerType) || 5;
        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                message: 'El parámetro query es obligatorio'
            });
            return;
        }
        const q = query.trim().toLowerCase();
        if (q.length === 0) {
            res.status(400).json({
                success: false,
                message: 'El parámetro query no puede estar vacío'
            });
            return;
        }
        const tokens = q.split(/\s+/);
        // Check cache for short queries (optional performance optimization)
        const cacheKey = `${q}_${limitPerType}`;
        if (q.length <= 20 && searchCache.has(cacheKey)) {
            const cachedEntry = searchCache.get(cacheKey);
            if (Date.now() - cachedEntry.timestamp < CACHE_TTL) {
                res.json(cachedEntry.data);
                return;
            }
            else {
                searchCache.delete(cacheKey);
            }
        }
        // Cache cleanup - remove old entries if cache is too large
        if (searchCache.size >= MAX_CACHE_SIZE) {
            const now = Date.now();
            for (const [key, entry] of searchCache.entries()) {
                if (now - entry.timestamp > CACHE_TTL) {
                    searchCache.delete(key);
                }
            }
        }
        // Función helper para crear condiciones de token
        const createTokenConditions = (fields) => {
            return tokens.map(token => ({
                [sequelize_1.Op.or]: fields.map(field => ({
                    [field]: { [sequelize_1.Op.iLike]: `%${token}%` }
                }))
            }));
        };
        // Determinar permisos según rol del usuario
        const userRole = req.usuario?.rol;
        const isManager = userRole === 'gerente';
        const isEmployee = userRole === 'empleado';
        // Buscar productos (accesible para empleados y gerentes)
        const productFields = ['codigo', 'nombre', 'descripcion'];
        const productConditions = createTokenConditions(productFields);
        const productos = await Product_1.default.findAll({
            where: {
                activo: true,
                [sequelize_1.Op.and]: productConditions
            },
            include: [
                { model: Category_1.default, as: 'categoria', attributes: ['id', 'nombre'] }
            ],
            limit: limitPerType,
            order: [['nombre', 'ASC']]
        });
        // Buscar ventas (accesible para empleados y gerentes, limitado a últimos 180 días)
        const saleFields = ['numero_documento', 'cliente_nombre', 'cliente_documento', 'observaciones'];
        const saleConditions = createTokenConditions(saleFields);
        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const ventas = await SalidaInventario_1.default.findAll({
            where: {
                estado: 'completado',
                fecha: { [sequelize_1.Op.gte]: sixMonthsAgo },
                [sequelize_1.Op.and]: saleConditions
            },
            limit: limitPerType,
            order: [['fecha', 'DESC']]
        });
        // Buscar categorías (solo para gerentes)
        let categorias = [];
        if (isManager) {
            const categoryFields = ['nombre', 'descripcion'];
            const categoryConditions = createTokenConditions(categoryFields);
            categorias = await Category_1.default.findAll({
                where: {
                    activa: true,
                    [sequelize_1.Op.and]: categoryConditions
                },
                limit: limitPerType,
                order: [['nombre', 'ASC']]
            });
        }
        // Buscar proveedores (solo para gerentes)
        let proveedores = [];
        if (isManager) {
            const supplierFields = ['nombre', 'ruc_dni', 'contacto_telefono', 'contacto_email', 'direccion'];
            const supplierConditions = createTokenConditions(supplierFields);
            proveedores = await Supplier_1.default.findAll({
                where: {
                    activo: true,
                    [sequelize_1.Op.and]: supplierConditions
                },
                limit: limitPerType,
                order: [['nombre', 'ASC']]
            });
        }
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
        // Cache the result for short queries (optional performance optimization)
        if (q.length <= 20) {
            searchCache.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });
        }
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
