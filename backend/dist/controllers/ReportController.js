"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = void 0;
const ReportService_1 = require("../services/ReportService");
const Product_1 = __importDefault(require("../models/Product"));
const reportService = new ReportService_1.ReportService();
const generateReport = async (req, res) => {
    try {
        const params = req.body;
        if (!params.type || !params.format) {
            return res.status(400).json({ message: 'Type and format are required' });
        }
        let data;
        // Obtener datos según tipo
        if (params.type === 'inventory_status') {
            const products = await Product_1.default.findAll({
                where: { activo: true },
                include: [{ model: require('../models/Category').default, as: 'categoria' }]
            });
            data = {
                products: products.map(p => ({
                    id: p.id,
                    name: p.nombre,
                    stock_actual: p.stock_actual,
                    stock_minimo: p.stock_minimo,
                    category: p.categoria?.nombre || 'Sin categoría'
                })),
                generatedAt: new Date()
            };
        }
        else {
            return res.status(400).json({ message: 'Report type not implemented yet' });
        }
        const buffer = params.format === 'pdf'
            ? await reportService.generatePDF(params.type, params, data)
            : await reportService.generateExcel(params.type, params, data);
        res.setHeader('Content-Type', params.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${params.type}.${params.format}"`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};
exports.generateReport = generateReport;
