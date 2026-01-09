"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salesController_1 = __importDefault(require("../controllers/salesController"));
const router = (0, express_1.Router)();
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
router.post('/import', ...salesController_1.default.uploadSales);
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
router.get('/', salesController_1.default.getSales);
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
router.get('/summary', salesController_1.default.getSalesSummary);
exports.default = router;
