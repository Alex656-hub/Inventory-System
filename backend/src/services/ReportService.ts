// backend/src/services/ReportService.ts
import PDFKit from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { ReportParams, InventoryReportData } from '../types/reports';

export class ReportService {
  async generatePDF(type: string, params: ReportParams, data: InventoryReportData): Promise<Buffer> {
    const doc = new PDFKit();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

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

  async generateExcel(type: string, params: ReportParams, data: InventoryReportData): Promise<Buffer> {
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

    return workbook.xlsx.writeBuffer() as any;
  }
}
