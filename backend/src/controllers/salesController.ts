// src/controllers/salesController.ts
import { Request, Response, RequestHandler } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SalesImportService } from '../services/salesImportService';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { DailySale, Product, Category, Supplier } from '../models/sales';

// Extender el tipo de Request para incluir file
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Configuración de multer
const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const filetypes = /xlsx|xls/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

class SalesController {
  // Upload and process Excel file
  public uploadSales: RequestHandler[] = [
    upload.single('file'),
    
    async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({
            success: false,
            message: 'No se ha proporcionado ningún archivo',
          });
          return;
        }

        const fileExt = path.extname(req.file.originalname).toLowerCase();
        if (!['.xlsx', '.xls'].includes(fileExt)) {
          res.status(400).json({
            success: false,
            message: 'Formato de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls)',
          });
          return;
        }

        // Procesar el archivo
        const result = await SalesImportService.importFromExcel(req.file);

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
      } catch (error: unknown) {
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

  // Get all sales with pagination and filters
  public async getSales(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '10', startDate, endDate, productId } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const whereClause: any = {};
      
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          whereClause.date[Op.lte] = end;
        }
      }
      
      if (productId) {
        whereClause.productId = productId;
      }
      
      const { count, rows } = await DailySale.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Product,
            as: 'product',
            include: [
              { model: Category, as: 'category' },
              { model: Supplier, as: 'supplier' },
            ],
          },
        ],
        order: [['date', 'DESC']],
        limit: parseInt(limit as string),
        offset,
      });
      
      res.status(200).json({
        success: true,
        data: {
          total: count,
          page: parseInt(page as string),
          totalPages: Math.ceil(count / parseInt(limit as string)),
          data: rows,
        },
      });
    } catch (error: unknown) {
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
  public async getSalesSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const whereClause: any = {};
      
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date[Op.gte] = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          whereClause.date[Op.lte] = end;
        }
      }
      
      // Obtener totales
      const totals = await DailySale.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('cost_price')), 'totalCost'],
          [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        ],
        raw: true,
      });
      
      // Obtener ventas por categoría
      const byCategory = await DailySale.findAll({
        where: whereClause,
        include: [
          {
            model: Product,
            as: 'product',
            include: [{ model: Category, as: 'category' }],
            attributes: [],
          },
        ],
        attributes: [
          [sequelize.col('product.category.name'), 'categoryName'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
          [sequelize.fn('COUNT', sequelize.col('daily_sales.id')), 'transactionCount'],
        ],
        group: ['product.category.name'],
        order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
        raw: true,
      });

      // Obtener tendencia de ventas (por día)
      const dateTrunc = sequelize.fn('date_trunc', 'day', sequelize.col('date'));
      
      const salesTrend = await DailySale.findAll({
        where: whereClause,
        attributes: [
          [dateTrunc, 'date'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
        ],
        group: ['date'],
        order: [['date', 'ASC']],
        raw: true,
      });

      // Obtener productos más vendidos
      const byProduct = await DailySale.findAll({
        where: whereClause,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['name', 'sku'],
          },
        ],
        attributes: [
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
          [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
        ],
        group: ['product.id'],
        order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
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
    } catch (error: unknown) {
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

export default new SalesController();