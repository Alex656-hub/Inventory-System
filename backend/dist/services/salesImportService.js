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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesImportService = void 0;
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../config/database");
const Category_1 = __importDefault(require("../models/Category"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const Product_1 = __importDefault(require("../models/Product"));
const SalidaInventario_1 = __importDefault(require("../models/SalidaInventario"));
const DetalleSalida_1 = __importDefault(require("../models/DetalleSalida"));
const sequelize_1 = require("sequelize");
const REQUIRED_COLUMNS = [
    'fecha',
    'sku',
    'nombre producto',
    'cantidad vendida',
    'precio venta unitario',
    'costo unitario',
    'categoria',
    'proveedor'
];
// Mapeo de columnas alternativas
const COLUMN_ALIASES = {
    'categoria': ['categoria', 'categoría', 'category', 'categoría producto'],
    'proveedor': ['proveedor', 'supplier', 'proveedor nombre'],
    'sku': ['sku', 'código', 'codigo', 'product code'],
    'nombre producto': ['nombre producto', 'producto', 'nombre', 'product name'],
    'cantidad vendida': ['cantidad vendida', 'cantidad', 'quantity', 'qty'],
    'precio venta unitario': ['precio venta unitario', 'precio venta', 'precio', 'price', 'precio unitario'],
    'costo unitario': ['costo unitario', 'costo', 'cost', 'precio compra']
};
class SalesImportService {
    static async importFromExcel(file, usuarioId) {
        const result = {
            totalRows: 0,
            processedRows: 0,
            newCategories: 0,
            newSuppliers: 0,
            newProducts: 0,
            newSalidas: 0,
            errors: [],
            proveedoresConRUCTemporal: []
        };
        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false });
            if (rows.length === 0) {
                throw new Error('El archivo Excel está vacío');
            }
            result.totalRows = rows.length;
            // Validar columnas con aliases
            const columnNames = Object.keys(rows[0])
                .map((k) => k.toLowerCase().trim())
                .filter((k) => k && k !== '__empty' && k !== 'undefined' && k !== 'null');
            // Función para verificar si una columna requerida está presente (considerando aliases)
            const hasColumn = (requiredColumn) => {
                const aliases = COLUMN_ALIASES[requiredColumn] || [requiredColumn];
                return aliases.some((alias) => columnNames.includes(alias.toLowerCase()));
            };
            const missing = REQUIRED_COLUMNS.filter(col => !hasColumn(col));
            if (missing.length > 0) {
                console.log('Columnas encontradas:', columnNames);
                console.log('Columnas requeridas:', REQUIRED_COLUMNS);
                console.log('Columnas faltantes:', missing);
                throw new Error(`Faltan columnas: ${missing.join(', ')}`);
            }
            const normalizedRows = rows.map((row) => {
                const n = {};
                Object.entries(row).forEach(([k, v]) => {
                    const key = k.toLowerCase().trim();
                    // Ignorar claves vacías, __empty, undefined, null, y claves numéricas
                    if (key &&
                        key !== '__empty' &&
                        key !== 'undefined' &&
                        key !== 'null' &&
                        !/^\d+$/.test(key)) {
                        // Buscar si esta clave coincide con alguna columna requerida (usando aliases)
                        let matchedKey = key;
                        for (const [requiredKey, aliases] of Object.entries(COLUMN_ALIASES)) {
                            if (aliases.includes(key)) {
                                matchedKey = requiredKey;
                                break;
                            }
                        }
                        n[matchedKey] = v;
                    }
                });
                return n;
            });
            await database_1.sequelize.transaction(async (t) => {
                const categoryMap = await this.processCategories(normalizedRows, t);
                const supplierMap = await this.processSuppliers(normalizedRows, result, t);
                const productMap = await this.processProducts(normalizedRows, categoryMap, supplierMap, result, t);
                await this.processSalidas(normalizedRows, productMap, usuarioId, result, t);
            });
            return result;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            throw new Error(msg);
        }
    }
    static async processCategories(rows, t) {
        const map = new Map();
        const names = [...new Set(rows.map((r) => (r.categoria || '').toString().trim()).filter(Boolean))];
        const existing = await Category_1.default.findAll({
            where: { nombre: { [sequelize_1.Op.in]: names } },
            transaction: t
        });
        existing.forEach((c) => map.set(c.nombre, c));
        const toCreate = names.filter((n) => !map.has(n));
        if (toCreate.length > 0) {
            const created = await Category_1.default.bulkCreate(toCreate.map((nombre) => ({ nombre })), { transaction: t });
            created.forEach((c) => map.set(c.nombre, c));
        }
        return map;
    }
    static async processSuppliers(rows, result, t) {
        const map = new Map();
        const names = [...new Set(rows.map((r) => (r.proveedor || '').toString().trim()).filter(Boolean))];
        const existing = await Supplier_1.default.findAll({
            where: { nombre: { [sequelize_1.Op.in]: names } },
            transaction: t
        });
        existing.forEach((s) => map.set(s.nombre, s));
        const toCreate = names.filter((n) => !map.has(n));
        if (toCreate.length > 0) {
            const created = await Supplier_1.default.bulkCreate(toCreate.map((nombre) => ({
                nombre,
                ruc_dni: `TEMP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}`
            })), { transaction: t });
            created.forEach((s) => map.set(s.nombre, s));
            // Registrar proveedores con RUC temporal para notificación
            result.proveedoresConRUCTemporal.push(...toCreate);
        }
        return map;
    }
    static async processProducts(rows, categoryMap, supplierMap, result, t) {
        const map = new Map();
        const skus = [...new Set(rows.map((r) => (r.sku || '').toString().trim()).filter(Boolean))];
        const existing = await Product_1.default.findAll({
            where: { codigo: { [sequelize_1.Op.in]: skus } },
            include: [
                { model: Category_1.default, as: 'categoria' },
                { model: Supplier_1.default, as: 'proveedor' }
            ],
            transaction: t
        });
        existing.forEach((p) => map.set(p.codigo, p));
        for (const row of rows) {
            const sku = (row.sku || '').toString().trim();
            if (!sku || map.has(sku))
                continue;
            const cat = categoryMap.get((row.categoria || '').toString().trim());
            const sup = supplierMap.get((row.proveedor || '').toString().trim());
            if (!cat || !sup)
                continue;
            const [created, wasCreated] = await Product_1.default.findOrCreate({
                where: { codigo: sku },
                defaults: {
                    codigo: sku,
                    nombre: (row['nombre producto'] || `Producto ${sku}`).toString().trim(),
                    categoria_id: cat.id,
                    proveedor_id: sup.id,
                    precio_compra: parseFloat(String(row['costo unitario'])) || 0,
                    precio_venta: parseFloat(String(row['precio venta unitario'])) || 0,
                    stock_actual: 0,
                    stock_minimo: 0
                },
                transaction: t
            });
            map.set(created.codigo, created);
            if (wasCreated)
                result.newProducts++;
        }
        return map;
    }
    static async processSalidas(rows, productMap, usuarioId, result, t) {
        // Agrupar por fecha para crear una SalidaInventario por día
        const byDate = new Map();
        for (const row of rows) {
            const sku = (row.sku || '').toString().trim();
            const product = productMap.get(sku);
            if (!product)
                continue;
            let fecha;
            try {
                fecha = new Date(row.fecha);
                if (isNaN(fecha.getTime()))
                    throw new Error('Fecha inválida');
            }
            catch {
                result.errors.push(`SKU ${sku}: Fecha inválida`);
                continue;
            }
            const cantidad = parseInt(String(row['cantidad vendida']), 10) || 0;
            const precio = parseFloat(String(row['precio venta unitario'])) || 0;
            const costo = parseFloat(String(row['costo unitario'])) || 0;
            if (cantidad <= 0 || precio <= 0) {
                result.errors.push(`SKU ${sku}: Cantidad o precio inválido`);
                continue;
            }
            const key = fecha.toISOString().split('T')[0];
            if (!byDate.has(key))
                byDate.set(key, []);
            const list = byDate.get(key);
            const existing = list.find((i) => i.producto.id === product.id);
            if (existing) {
                existing.cantidad += cantidad;
            }
            else {
                list.push({ producto: product, cantidad, precio, costo });
            }
            result.processedRows++;
        }
        for (const [dateStr, items] of byDate) {
            const total = items.reduce((s, i) => s + i.cantidad * i.precio, 0);
            const salida = await SalidaInventario_1.default.create({
                numero_documento: `IMP-${dateStr.replace(/-/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                fecha: new Date(dateStr),
                usuario_id: usuarioId,
                tipo_documento: 'boleta',
                total,
                metodo_pago: 'efectivo',
                estado: 'completado'
            }, { transaction: t });
            for (const item of items) {
                await DetalleSalida_1.default.create({
                    salida_id: salida.id,
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                    subtotal: item.cantidad * item.precio
                }, { transaction: t });
            }
            result.newSalidas++;
        }
    }
}
exports.SalesImportService = SalesImportService;
