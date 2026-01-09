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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesImportService = void 0;
const XLSX = __importStar(require("xlsx"));
const sales_1 = require("../models/sales");
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
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
class SalesImportService {
    static async importFromExcel(file) {
        const result = {
            totalRows: 0,
            processedRows: 0,
            newCategories: 0,
            newSuppliers: 0,
            newProducts: 0,
            newSales: 0,
            errors: []
        };
        try {
            // Read Excel file
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false });
            if (rows.length === 0) {
                throw new Error('El archivo Excel está vacío');
            }
            // Validate columns
            const firstRow = rows[0];
            const columnNames = Object.keys(firstRow).map(name => name.toLowerCase().trim());
            const missingColumns = REQUIRED_COLUMNS.filter(col => !columnNames.some(name => name === col.toLowerCase()));
            if (missingColumns.length > 0) {
                throw new Error(`Faltan columnas obligatorias: ${missingColumns.join(', ')}`);
            }
            // Normalize column names
            const normalizedRows = rows.map(row => {
                const normalized = {};
                Object.entries(row).forEach(([key, value]) => {
                    normalized[key.toLowerCase().trim()] = value;
                });
                return normalized;
            });
            // Process in transaction
            await database_1.sequelize.transaction(async (t) => {
                // Process categories and suppliers first
                const categories = await this.processCategories(normalizedRows, t);
                const suppliers = await this.processSuppliers(normalizedRows, t);
                // Process products
                const products = await this.processProducts(normalizedRows, categories, suppliers, t);
                // Process sales
                await this.processSales(normalizedRows, products, result, t);
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            console.error('Error importing sales data:', errorMessage);
            throw error instanceof Error ? error : new Error('Error desconocido al importar datos');
        }
    }
    static async processCategories(rows, transaction) {
        const categoryMap = new Map();
        const uniqueCategories = [...new Set(rows.map(row => row.categoria?.toString().trim()).filter(Boolean))];
        // Find existing categories
        const existingCategories = await sales_1.Category.findAll({
            where: { name: { [sequelize_1.Op.in]: uniqueCategories } },
            transaction
        });
        // Add existing to map
        existingCategories.forEach(cat => categoryMap.set(cat.name, cat));
        // Create new categories
        const newCategories = uniqueCategories.filter(name => !categoryMap.has(name) && name);
        if (newCategories.length > 0) {
            const createdCategories = await sales_1.Category.bulkCreate(newCategories.map(name => ({
                name,
                createdAt: new Date(),
                updatedAt: new Date()
            })), { transaction });
            createdCategories.forEach(cat => categoryMap.set(cat.name, cat));
        }
        return categoryMap;
    }
    static async processSuppliers(rows, transaction) {
        const supplierMap = new Map();
        const uniqueSuppliers = [...new Set(rows.map(row => row.proveedor?.toString().trim()).filter(Boolean))];
        // Find existing suppliers
        const existingSuppliers = await sales_1.Supplier.findAll({
            where: { name: { [sequelize_1.Op.in]: uniqueSuppliers } },
            transaction
        });
        // Add existing to map
        existingSuppliers.forEach(sup => supplierMap.set(sup.name, sup));
        // Create new suppliers
        const newSuppliers = uniqueSuppliers.filter(name => !supplierMap.has(name) && name);
        if (newSuppliers.length > 0) {
            const createdSuppliers = await sales_1.Supplier.bulkCreate(newSuppliers.map(name => ({
                name,
                createdAt: new Date(),
                updatedAt: new Date()
            })), { transaction });
            createdSuppliers.forEach(sup => supplierMap.set(sup.name, sup));
        }
        return supplierMap;
    }
    static async processProducts(rows, categories, suppliers, transaction) {
        const productMap = new Map();
        const uniqueSkus = [...new Set(rows.map(row => row.sku?.toString().trim()).filter(Boolean))];
        // Find existing products
        const existingProducts = await sales_1.Product.findAll({
            where: { sku: { [sequelize_1.Op.in]: uniqueSkus } },
            include: [
                { model: sales_1.Category, as: 'category' },
                { model: sales_1.Supplier, as: 'supplier' }
            ],
            transaction
        });
        // Add existing to map
        existingProducts.forEach(prod => productMap.set(prod.sku, prod));
        // Prepare new products
        const productsToCreate = [];
        // Group by SKU and get the most recent data
        rows.forEach(row => {
            const sku = row.sku?.toString().trim();
            if (!sku || productMap.has(sku))
                return;
            const category = categories.get(row.categoria?.toString().trim() || '');
            const supplier = suppliers.get(row.proveedor?.toString().trim() || '');
            if (category && supplier) {
                productsToCreate.push({
                    sku,
                    name: row['nombre producto']?.toString().trim() || `Producto ${sku}`,
                    categoryId: category.id,
                    supplierId: supplier.id,
                    costPrice: parseFloat(String(row['costo unitario'])) || 0,
                    sellingPrice: parseFloat(String(row['precio venta unitario'])) || 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        });
        // Create new products
        if (productsToCreate.length > 0) {
            const createdProducts = await sales_1.Product.bulkCreate(productsToCreate, // Hacemos un cast a any para evitar problemas con los tipos de Sequelize
            {
                transaction,
                returning: true,
                validate: true
            });
            createdProducts.forEach(prod => productMap.set(prod.sku, prod));
        }
        return productMap;
    }
    static async processSales(rows, products, result, transaction) {
        const salesToCreate = [];
        const existingSales = new Set();
        // Process each row
        for (const row of rows) {
            try {
                const sku = row.sku?.toString().trim();
                if (!sku)
                    continue;
                const product = products.get(sku);
                if (!product)
                    continue;
                // Parse date
                let saleDate;
                try {
                    saleDate = new Date(row.fecha);
                    if (isNaN(saleDate.getTime())) {
                        throw new Error('Fecha inválida');
                    }
                }
                catch (error) {
                    result.errors.push(`SKU ${sku}: Fecha inválida: ${row.fecha}`);
                    continue;
                }
                // Parse quantities and prices
                const quantity = parseInt(String(row['cantidad vendida']), 10) || 0;
                const unitPrice = parseFloat(String(row['precio venta unitario'])) || 0;
                const costPrice = parseFloat(String(row['costo unitario'])) || 0;
                const totalAmount = quantity * unitPrice;
                const profit = totalAmount - (quantity * costPrice);
                if (quantity <= 0 || unitPrice <= 0) {
                    result.errors.push(`SKU ${sku}: Cantidad o precio unitario inválido (cantidad: ${quantity}, precio: ${unitPrice})`);
                    continue;
                }
                const saleKey = `${saleDate.toISOString().split('T')[0]}_${product.id}`;
                if (existingSales.has(saleKey)) {
                    // Skip duplicate date+product entries
                    continue;
                }
                salesToCreate.push({
                    date: saleDate,
                    productId: product.id,
                    quantity,
                    unitPrice,
                    totalAmount,
                    costPrice: costPrice * quantity,
                    profit
                });
                existingSales.add(saleKey);
                result.processedRows++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                result.errors.push(`Error procesando fila: ${errorMessage}`);
            }
        }
        // Insert all sales in batch
        if (salesToCreate.length > 0) {
            await sales_1.DailySale.bulkCreate(salesToCreate, {
                updateOnDuplicate: ['quantity', 'unitPrice', 'totalAmount', 'costPrice', 'profit', 'updatedAt'],
                transaction
            });
            result.newSales = salesToCreate.length;
        }
    }
}
exports.SalesImportService = SalesImportService;
exports.default = new SalesImportService();
