import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import { Category, Supplier, Product, DailySale, ProductAttributes } from '../models/sales';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';

// Usar el tipo de creación de Producto que espera Sequelize
type ProductCreationAttributes = Omit<ProductAttributes, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'supplier'> & {
  categoryId: number;
  supplierId: number;
  createdAt?: Date;
  updatedAt?: Date;
};

// Tipo para el bulkCreate
type ProductBulkCreateAttributes = Omit<ProductAttributes, 'id' | 'category' | 'supplier'> & {
  categoryId: number;
  supplierId: number;
};

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

interface ExcelRow {
  [key: string]: any;
  fecha: string | Date;
  sku: string;
  'nombre producto': string;
  'cantidad vendida': number;
  'precio venta unitario': number;
  'costo unitario': number;
  categoria: string;
  proveedor: string;
}

export interface ImportResult {
  totalRows: number;
  processedRows: number;
  newCategories: number;
  newSuppliers: number;
  newProducts: number;
  newSales: number;
  errors: string[];
}

export class SalesImportService {
  static async importFromExcel(file: Express.Multer.File): Promise<ImportResult> {
    const result: ImportResult = {
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
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (rows.length === 0) {
        throw new Error('El archivo Excel está vacío');
      }

      // Validate columns
      const firstRow = rows[0];
      const columnNames = Object.keys(firstRow).map(name => name.toLowerCase().trim());
      
      const missingColumns = REQUIRED_COLUMNS.filter(
        col => !columnNames.some(name => name === col.toLowerCase())
      );

      if (missingColumns.length > 0) {
        throw new Error(`Faltan columnas obligatorias: ${missingColumns.join(', ')}`);
      }

      // Normalize column names
      const normalizedRows = rows.map(row => {
        const normalized: any = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[key.toLowerCase().trim()] = value;
        });
        return normalized as ExcelRow;
      });

      // Process in transaction
      await sequelize.transaction(async (t) => {
        // Process categories and suppliers first
        const categories = await this.processCategories(normalizedRows, t);
        const suppliers = await this.processSuppliers(normalizedRows, t);

        // Process products
        const products = await this.processProducts(
          normalizedRows, 
          categories, 
          suppliers, 
          t
        );

        // Process sales
        await this.processSales(normalizedRows, products, result, t);
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error importing sales data:', errorMessage);
      throw error instanceof Error ? error : new Error('Error desconocido al importar datos');
    }
  }

  private static async processCategories(
    rows: ExcelRow[], 
    transaction: Transaction
  ): Promise<Map<string, Category>> {
    const categoryMap = new Map<string, Category>();
    const uniqueCategories = [...new Set(rows.map(row => row.categoria?.toString().trim()).filter(Boolean))];

    // Find existing categories
    const existingCategories = await Category.findAll({
      where: { name: { [Op.in]: uniqueCategories } },
      transaction
    });

    // Add existing to map
    existingCategories.forEach(cat => categoryMap.set(cat.name, cat));

    // Create new categories
    const newCategories = uniqueCategories.filter(
      name => !categoryMap.has(name) && name
    );

    if (newCategories.length > 0) {
      const createdCategories = await Category.bulkCreate(
        newCategories.map(name => ({
          name,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any)),
        { transaction }
      );
      createdCategories.forEach(cat => categoryMap.set(cat.name, cat));
    }

    return categoryMap;
  }

  private static async processSuppliers(
    rows: ExcelRow[], 
    transaction: Transaction
  ): Promise<Map<string, Supplier>> {
    const supplierMap = new Map<string, Supplier>();
    const uniqueSuppliers = [...new Set(rows.map(row => row.proveedor?.toString().trim()).filter(Boolean))];

    // Find existing suppliers
    const existingSuppliers = await Supplier.findAll({
      where: { name: { [Op.in]: uniqueSuppliers } },
      transaction
    });

    // Add existing to map
    existingSuppliers.forEach(sup => supplierMap.set(sup.name, sup));

    // Create new suppliers
    const newSuppliers = uniqueSuppliers.filter(
      name => !supplierMap.has(name) && name
    );

    if (newSuppliers.length > 0) {
      const createdSuppliers = await Supplier.bulkCreate(
        newSuppliers.map(name => ({
          name,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any)),
        { transaction }
      );
      createdSuppliers.forEach(sup => supplierMap.set(sup.name, sup));
    }

    return supplierMap;
  }

  private static async processProducts(
    rows: ExcelRow[],
    categories: Map<string, Category>,
    suppliers: Map<string, Supplier>,
    transaction: Transaction
  ): Promise<Map<string, Product>> {
    const productMap = new Map<string, Product>();
    const uniqueSkus = [...new Set(rows.map(row => row.sku?.toString().trim()).filter(Boolean))];

    // Find existing products
    const existingProducts = await Product.findAll({
      where: { sku: { [Op.in]: uniqueSkus } },
      include: [
        { model: Category, as: 'category' },
        { model: Supplier, as: 'supplier' }
      ],
      transaction
    });

    // Add existing to map
    existingProducts.forEach(prod => productMap.set(prod.sku, prod));

    // Prepare new products
    const productsToCreate: ProductBulkCreateAttributes[] = [];
    
    // Group by SKU and get the most recent data
    rows.forEach(row => {
      const sku = row.sku?.toString().trim();
      if (!sku || productMap.has(sku)) return;

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
      const createdProducts = await Product.bulkCreate(
        productsToCreate as any, // Hacemos un cast a any para evitar problemas con los tipos de Sequelize
        { 
          transaction,
          returning: true,
          validate: true
        }
      );
      createdProducts.forEach(prod => productMap.set(prod.sku, prod));
    }

    return productMap;
  }

  private static async processSales(
    rows: ExcelRow[],
    products: Map<string, Product>,
    result: ImportResult,
    transaction: Transaction
  ): Promise<void> {
    const salesToCreate: any[] = [];
    const existingSales = new Set<string>();

    // Process each row
    for (const row of rows) {
      try {
        const sku = row.sku?.toString().trim();
        if (!sku) continue;

        const product = products.get(sku);
        if (!product) continue;

        // Parse date
        let saleDate: Date;
        try {
          saleDate = new Date(row.fecha);
          if (isNaN(saleDate.getTime())) {
            throw new Error('Fecha inválida');
          }
        } catch (error) {
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
          result.errors.push(
            `SKU ${sku}: Cantidad o precio unitario inválido (cantidad: ${quantity}, precio: ${unitPrice})`
          );
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        result.errors.push(`Error procesando fila: ${errorMessage}`);
      }
    }

    // Insert all sales in batch
    if (salesToCreate.length > 0) {
      await DailySale.bulkCreate(salesToCreate, {
        updateOnDuplicate: ['quantity', 'unitPrice', 'totalAmount', 'costPrice', 'profit', 'updatedAt'],
        transaction
      });
      result.newSales = salesToCreate.length;
    }
  }
}

export default new SalesImportService();
