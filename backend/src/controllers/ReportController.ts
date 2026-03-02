// backend/src/controllers/ReportController.ts
import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';
import { ReportParams, InventoryReportData } from '../types/reports';
import Product from '../models/Product';

const reportService = new ReportService();

export const generateReport = async (req: Request, res: Response) => {
  try {
    const params: ReportParams = req.body;

    if (!params.type || !params.format) {
      return res.status(400).json({ message: 'Type and format are required' });
    }

    let data: any;

    // Obtener datos según tipo
    if (params.type === 'inventory_status') {
      const products = await Product.findAll({
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
    } else {
      return res.status(400).json({ message: 'Report type not implemented yet' });
    }

    const buffer = params.format === 'pdf'
      ? await reportService.generatePDF(params.type, params, data)
      : await reportService.generateExcel(params.type, params, data);

    res.setHeader('Content-Type', params.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${params.type}.${params.format}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
};
