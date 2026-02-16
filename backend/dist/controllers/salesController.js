"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const salesImportService_1 = require("../services/salesImportService");
const sequelize_1 = require("sequelize");
const SalidaInventario_1 = __importDefault(require("../models/SalidaInventario"));
const DetalleSalida_1 = __importDefault(require("../models/DetalleSalida"));
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const User_1 = __importDefault(require("../models/User"));
// Configuración de multer
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
    // Ser más flexible con el mimetype - algunos navegadores no lo envían correctamente
    const allowedMimetypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream' // A veces los archivos se envían como binary
    ];
    const mimetype = allowedMimetypes.includes(file.mimetype) || !file.mimetype;
    if (extname && mimetype) {
        return cb(null, true);
    }
    else {
        cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
};
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter,
});
class SalesController {
    constructor() {
        // Upload and process Excel file
        this.uploadSales = [
            upload.single('file'),
            async (req, res) => {
                try {
                    console.log('=== INICIO IMPORTACIÓN ===');
                    console.log('req.file:', req.file);
                    console.log('req.usuario:', req.usuario?.email);
                    if (!req.file) {
                        console.log('ERROR: No se proporcionó archivo');
                        res.status(400).json({
                            success: false,
                            message: 'No se ha proporcionado ningún archivo',
                        });
                        return;
                    }
                    console.log('Archivo recibido:', {
                        originalname: req.file.originalname,
                        mimetype: req.file.mimetype,
                        size: req.file.size,
                        bufferLength: req.file.buffer?.length
                    });
                    const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
                    if (!['.xlsx', '.xls'].includes(fileExt)) {
                        console.log('ERROR: Formato de archivo inválido:', fileExt);
                        res.status(400).json({
                            success: false,
                            message: 'Formato de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls)',
                        });
                        return;
                    }
                    // Verificar que el usuario esté autenticado
                    if (!req.usuario) {
                        console.log('ERROR: Usuario no autenticado');
                        res.status(401).json({ success: false, message: 'No autenticado' });
                        return;
                    }
                    console.log('Iniciando procesamiento del archivo...');
                    // Procesar el archivo
                    const result = await salesImportService_1.SalesImportService.importFromExcel(req.file, req.usuario.id);
                    console.log('Procesamiento completado:', result);
                    const response = {
                        success: true,
                        message: 'Archivo procesado exitosamente',
                        data: {
                            filasProcesadas: result.processedRows,
                            nuevasCategorias: result.newCategories,
                            nuevosProveedores: result.newSuppliers,
                            nuevosProductos: result.newProducts,
                            nuevasSalidas: result.newSalidas,
                            errores: result.errors.length > 0 ? result.errors : undefined,
                            proveedoresConRUCTemporal: result.proveedoresConRUCTemporal?.length
                                ? result.proveedoresConRUCTemporal
                                : undefined,
                        },
                    };
                    console.log('Enviando respuesta exitosa');
                    res.status(200).json(response);
                }
                catch (error) {
                    console.error('Error al procesar el archivo:', error);
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Error desconocido al procesar el archivo';
                    console.error('Mensaje de error:', errorMessage);
                    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
                    res.status(500).json({
                        success: false,
                        message: 'Error al procesar el archivo',
                        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
                    });
                }
            },
        ];
    }
    // Get all sales with pagination and filters
    async getSales(req, res) {
        try {
            const { page = '1', limit = '10', startDate, endDate, productId } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const whereClause = { estado: 'completado' };
            if (startDate || endDate) {
                whereClause.fecha = {};
                if (startDate)
                    whereClause.fecha[sequelize_1.Op.gte] = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    whereClause.fecha[sequelize_1.Op.lte] = end;
                }
            }
            // Configurar include para filtrar por productId si se especifica
            const includeOptions = [
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre'] },
                {
                    model: DetalleSalida_1.default,
                    as: 'detalles',
                    include: [
                        {
                            model: Product_1.default,
                            as: 'producto',
                            include: [
                                { model: Category_1.default, as: 'categoria' },
                                { model: Supplier_1.default, as: 'proveedor' }
                            ]
                        }
                    ]
                }
            ];
            // Si hay productId, agregar where en el include para filtrar por producto
            if (productId) {
                const productIdNum = parseInt(productId);
                includeOptions[1].where = { producto_id: productIdNum };
                includeOptions[1].required = true; // INNER JOIN para asegurar que solo traiga salidas con ese producto
            }
            const { count, rows } = await SalidaInventario_1.default.findAndCountAll({
                where: whereClause,
                include: includeOptions,
                limit: parseInt(limit),
                offset,
                order: [['fecha', 'DESC']],
                distinct: true // Necesario para count correcto con includes
            });
            res.status(200).json({
                success: true,
                data: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    data: rows
                },
            });
        }
        catch (error) {
            console.error('Error al obtener las ventas:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            res.status(500).json({
                success: false,
                message: 'Error al obtener las ventas',
                error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
            });
        }
    }
    // ... (código anterior)
    // Get sales summary
    async getSalesSummary(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const whereClause = { estado: 'completado' };
            if (startDate || endDate) {
                whereClause.fecha = {};
                if (startDate)
                    whereClause.fecha[sequelize_1.Op.gte] = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    whereClause.fecha[sequelize_1.Op.lte] = end;
                }
            }
            const salidas = await SalidaInventario_1.default.findAll({
                where: whereClause,
                include: [
                    {
                        model: DetalleSalida_1.default,
                        as: 'detalles',
                        include: [
                            {
                                model: Product_1.default,
                                as: 'producto',
                                include: [
                                    { model: Category_1.default, as: 'categoria' }
                                ]
                            }
                        ]
                    }
                ]
            });
            // Calcular totales
            let totalSales = 0;
            let totalCost = 0;
            const byCategory = {};
            const productMap = new Map();
            salidas.forEach((salida) => {
                (salida.detalles || []).forEach((detalle) => {
                    const cantidad = Number(detalle.cantidad);
                    const subtotal = Number(detalle.subtotal);
                    const cost = cantidad * Number(detalle.producto?.precio_compra || 0);
                    const profit = subtotal - cost;
                    totalSales += subtotal;
                    totalCost += cost;
                    const catName = detalle.producto?.categoria?.nombre || 'Sin categoría';
                    if (!byCategory[catName])
                        byCategory[catName] = { totalSales: 0, totalProfit: 0, count: 0 };
                    byCategory[catName].totalSales += subtotal;
                    byCategory[catName].totalProfit += profit;
                    byCategory[catName].count += 1;
                    const prodId = detalle.producto_id;
                    if (!productMap.has(prodId)) {
                        productMap.set(prodId, {
                            producto: detalle.producto,
                            quantity: 0,
                            sales: 0,
                            cost: 0
                        });
                    }
                    const p = productMap.get(prodId);
                    p.quantity += cantidad;
                    p.sales += subtotal;
                    p.cost += cost;
                });
            });
            const byCategoryArr = Object.entries(byCategory).map(([name, v]) => ({
                categoryName: name,
                totalSales: v.totalSales,
                totalProfit: v.totalProfit,
                transactionCount: v.count
            })).sort((a, b) => b.totalSales - a.totalSales);
            const byProductArr = Array.from(productMap.values())
                .map(({ producto, quantity, sales, cost }) => ({
                producto: { id: producto?.id, nombre: producto?.nombre, codigo: producto?.codigo },
                totalQuantity: quantity,
                totalSales: sales,
                totalProfit: sales - cost
            }))
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, 10);
            // Tendencia por día
            const dateSales = {};
            salidas.forEach((s) => {
                const d = new Date(s.fecha).toISOString().split('T')[0];
                if (!dateSales[d])
                    dateSales[d] = { totalSales: 0, totalProfit: 0, count: 0 };
                dateSales[d].totalSales += Number(s.total);
                dateSales[d].count += 1;
                (s.detalles || []).forEach((det) => {
                    const cost = Number(det.cantidad) * Number(det.producto?.precio_compra || 0);
                    dateSales[d].totalProfit += Number(det.subtotal) - cost;
                });
            });
            const salesTrend = Object.entries(dateSales).map(([date, v]) => ({
                date,
                totalSales: v.totalSales,
                totalProfit: v.totalProfit,
                transactionCount: v.count
            })).sort((a, b) => a.date.localeCompare(b.date));
            res.status(200).json({
                success: true,
                data: {
                    totals: {
                        totalSales,
                        totalCost,
                        totalProfit: totalSales - totalCost,
                        totalTransactions: salidas.length
                    },
                    byCategory: byCategoryArr,
                    byProduct: byProductArr,
                    salesTrend
                },
            });
        }
        catch (error) {
            console.error('Error al obtener el resumen de ventas:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            res.status(500).json({
                success: false,
                message: 'Error al obtener el resumen de ventas',
                error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
            });
        }
    }
}
exports.default = new SalesController();
