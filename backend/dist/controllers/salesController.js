"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const salesImportService_1 = require("../services/salesImportService");
const database_1 = require("../config/database");
const sequelize_1 = require("sequelize");
const sales_1 = require("../models/sales");
// Configuración de multer
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
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
                    if (!req.file) {
                        res.status(400).json({
                            success: false,
                            message: 'No se ha proporcionado ningún archivo',
                        });
                        return;
                    }
                    const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
                    if (!['.xlsx', '.xls'].includes(fileExt)) {
                        res.status(400).json({
                            success: false,
                            message: 'Formato de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls)',
                        });
                        return;
                    }
                    // Procesar el archivo
                    const result = await salesImportService_1.SalesImportService.importFromExcel(req.file);
                    const response = {
                        success: true,
                        message: 'Archivo procesado exitosamente',
                        data: {
                            filasProcesadas: result.processedRows,
                            nuevasCategorias: result.newCategories,
                            nuevosProveedores: result.newSuppliers,
                            nuevosProductos: result.newProducts,
                            nuevasVentas: result.newSales,
                            errores: result.errors.length > 0 ? result.errors : undefined,
                        },
                    };
                    res.status(200).json(response);
                }
                catch (error) {
                    console.error('Error al procesar el archivo:', error);
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Error desconocido al procesar el archivo';
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
            const whereClause = {};
            if (startDate || endDate) {
                whereClause.date = {};
                if (startDate)
                    whereClause.date[sequelize_1.Op.gte] = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    whereClause.date[sequelize_1.Op.lte] = end;
                }
            }
            if (productId) {
                whereClause.productId = productId;
            }
            const { count, rows } = await sales_1.DailySale.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: sales_1.Product,
                        as: 'product',
                        include: [
                            { model: sales_1.Category, as: 'category' },
                            { model: sales_1.Supplier, as: 'supplier' },
                        ],
                    },
                ],
                order: [['date', 'DESC']],
                limit: parseInt(limit),
                offset,
            });
            res.status(200).json({
                success: true,
                data: {
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    data: rows,
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
            const whereClause = {};
            if (startDate || endDate) {
                whereClause.date = {};
                if (startDate)
                    whereClause.date[sequelize_1.Op.gte] = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    whereClause.date[sequelize_1.Op.lte] = end;
                }
            }
            // Obtener totales
            const totals = await sales_1.DailySale.findAll({
                where: whereClause,
                attributes: [
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('total_amount')), 'totalSales'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('cost_price')), 'totalCost'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('profit')), 'totalProfit'],
                    [database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'totalTransactions'],
                ],
                raw: true,
            });
            // Obtener ventas por categoría
            const byCategory = await sales_1.DailySale.findAll({
                where: whereClause,
                include: [
                    {
                        model: sales_1.Product,
                        as: 'product',
                        include: [{ model: sales_1.Category, as: 'category' }],
                        attributes: [],
                    },
                ],
                attributes: [
                    [database_1.sequelize.col('product.category.name'), 'categoryName'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('total_amount')), 'totalSales'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('profit')), 'totalProfit'],
                    [database_1.sequelize.fn('COUNT', database_1.sequelize.col('daily_sales.id')), 'transactionCount'],
                ],
                group: ['product.category.name'],
                order: [[database_1.sequelize.fn('SUM', database_1.sequelize.col('total_amount')), 'DESC']],
                raw: true,
            });
            // Obtener tendencia de ventas (por día)
            const dateTrunc = database_1.sequelize.fn('date_trunc', 'day', database_1.sequelize.col('date'));
            const salesTrend = await sales_1.DailySale.findAll({
                where: whereClause,
                attributes: [
                    [dateTrunc, 'date'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('total_amount')), 'totalSales'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('profit')), 'totalProfit'],
                    [database_1.sequelize.fn('COUNT', database_1.sequelize.col('id')), 'transactionCount'],
                ],
                group: ['date'],
                order: [['date', 'ASC']],
                raw: true,
            });
            // Obtener productos más vendidos
            const byProduct = await sales_1.DailySale.findAll({
                where: whereClause,
                include: [
                    {
                        model: sales_1.Product,
                        as: 'product',
                        attributes: ['name', 'sku'],
                    },
                ],
                attributes: [
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('quantity')), 'totalQuantity'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('total_amount')), 'totalSales'],
                    [database_1.sequelize.fn('SUM', database_1.sequelize.col('profit')), 'totalProfit'],
                ],
                group: ['product.id'],
                order: [[database_1.sequelize.fn('SUM', database_1.sequelize.col('total_amount')), 'DESC']],
                limit: 10,
            });
            res.status(200).json({
                success: true,
                data: {
                    totals: totals[0] || {
                        totalSales: 0,
                        totalCost: 0,
                        totalProfit: 0,
                        totalTransactions: 0
                    },
                    byCategory,
                    byProduct,
                    salesTrend,
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
