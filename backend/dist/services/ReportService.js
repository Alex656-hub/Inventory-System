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
exports.ReportService = void 0;
// backend/src/services/ReportService.ts
const pdfkit_1 = __importDefault(require("pdfkit"));
const ExcelJS = __importStar(require("exceljs"));
class ReportService {
    async generatePDF(type, params, data) {
        const doc = new pdfkit_1.default();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => { });
        doc.fontSize(18).text(`Reporte: ${type}`, 50, 50);
        doc.fontSize(12).text(`Generado: ${new Date().toLocaleString()}`, 50, 80);
        // Tabla simple
        data.products.forEach((product, index) => {
            doc.text(`${index + 1}. ${product.name} - Stock: ${product.stock_actual}`, 50, 100 + index * 20);
        });
        doc.end();
        return new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
        });
    }
    async generateExcel(type, params, data) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Producto', key: 'name', width: 30 },
            { header: 'Stock Actual', key: 'stock_actual', width: 15 },
            { header: 'Stock Mínimo', key: 'stock_minimo', width: 15 },
            { header: 'Categoría', key: 'category', width: 20 }
        ];
        data.products.forEach((product) => worksheet.addRow(product));
        return workbook.xlsx.writeBuffer();
    }
}
exports.ReportService = ReportService;
