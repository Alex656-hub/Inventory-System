import { Router } from 'express';
import salesController from '../controllers/salesController';

const router = Router();

/**
 * @swagger
 * /api/sales/import:
 *   post:
 *     summary: Import sales data from Excel file
 *     tags: [Sales]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         description: Excel file with sales data
 *         required: true
 *     responses:
 *       200:
 *         description: File processed successfully
 *       400:
 *         description: Invalid file format or missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/import', ...salesController.uploadSales);

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get paginated sales data
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales to this date (YYYY-MM-DD)
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter by product ID
 *     responses:
 *       200:
 *         description: List of sales with pagination info
 *       500:
 *         description: Internal server error
 */
router.get('/', salesController.getSales);

/**
 * @swagger
 * /api/sales/summary:
 *   get:
 *     summary: Get sales summary and analytics
 *     tags: [Sales]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales to this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Sales summary data
 *       500:
 *         description: Internal server error
 */
router.get('/summary', salesController.getSalesSummary);

export default router;
