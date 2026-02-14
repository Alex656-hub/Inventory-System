import * as XLSX from 'xlsx';
import { sequelize } from '../config/database';
import { Transaction } from 'sequelize';
import Category from '../models/Category';
import Supplier from '../models/Supplier';
import Product from '../models/Product';
import SalidaInventario from '../models/SalidaInventario';
import DetalleSalida from '../models/DetalleSalida';
import { Op } from 'sequelize';

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

// Mapeo de columnas alternativas
const COLUMN_ALIASES = {
  'categoria': ['categoria', 'categoría', 'category', 'categoría producto'],
  'proveedor': ['proveedor', 'supplier', 'proveedor nombre'],
  'sku': ['sku', 'código', 'codigo', 'product code'],
  'nombre producto': ['nombre producto', 'producto', 'nombre', 'product name'],
  'cantidad vendida': ['cantidad vendida', 'cantidad', 'quantity', 'qty'],
  'precio venta unitario': ['precio venta unitario', 'precio venta', 'precio', 'price', 'precio unitario'],
  'costo unitario': ['costo unitario', 'costo', 'cost', 'precio compra']
};

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
  newSalidas: number;
  errors: string[];
  proveedoresConRUCTemporal?: string[]; // Nombres de proveedores con RUC temporal
}

export class SalesImportService {
  static async importFromExcel(
    file: Express.Multer.File,
    usuarioId: number
  ): Promise<ImportResult> {
    const result: ImportResult = {
      totalRows: 0,
      processedRows: 0,
      newCategories: 0,
      newSuppliers: 0,
      newProducts: 0,
      newSalidas: 0,
      errors: [],
      proveedoresConRUCTemporal: []
    };

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (rows.length === 0) {
        throw new Error('El archivo Excel está vacío');
      }

      result.totalRows = rows.length;

      // Validar columnas con aliases
      const columnNames = Object.keys(rows[0])
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k && k !== '__empty' && k !== 'undefined' && k !== 'null');
      
      // Función para verificar si una columna requerida está presente (considerando aliases)
      const hasColumn = (requiredColumn: string): boolean => {
        const aliases = (COLUMN_ALIASES as any)[requiredColumn] || [requiredColumn];
        return aliases.some((alias: string) => columnNames.includes(alias.toLowerCase()));
      };
      
      const missing = REQUIRED_COLUMNS.filter(col => !hasColumn(col));

      if (missing.length > 0) {
        console.log('Columnas encontradas:', columnNames);
        console.log('Columnas requeridas:', REQUIRED_COLUMNS);
        console.log('Columnas faltantes:', missing);
        throw new Error(`Faltan columnas: ${missing.join(', ')}`);
      }

      const normalizedRows = rows.map((row) => {
        const n: any = {};
        Object.entries(row).forEach(([k, v]) => {
          const key = k.toLowerCase().trim();
          
          // Ignorar claves vacías, __empty, undefined, null, y claves numéricas
          if (key && 
              key !== '__empty' && 
              key !== 'undefined' && 
              key !== 'null' && 
              !/^\d+$/.test(key)) {
            
            // Buscar si esta clave coincide con alguna columna requerida (usando aliases)
            let matchedKey = key;
            for (const [requiredKey, aliases] of Object.entries(COLUMN_ALIASES)) {
              if (aliases.includes(key)) {
                matchedKey = requiredKey;
                break;
              }
            }
            
            n[matchedKey] = v;
          }
        });
        return n as ExcelRow;
      });

      await sequelize.transaction(async (t) => {
        const categoryMap = await this.processCategories(normalizedRows, t);
        const supplierMap = await this.processSuppliers(normalizedRows, result, t);
        const productMap = await this.processProducts(
          normalizedRows,
          categoryMap,
          supplierMap,
          result,
          t
        );
        await this.processSalidas(
          normalizedRows,
          productMap,
          usuarioId,
          result,
          t
        );
      });

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(msg);
    }
  }

  private static async processCategories(
    rows: ExcelRow[],
    t: Transaction
  ): Promise<Map<string, Category>> {
    const map = new Map<string, Category>();
    const names = [...new Set(rows.map((r) => (r.categoria || '').toString().trim()).filter(Boolean))];

    const existing = await Category.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });

    existing.forEach((c) => map.set(c.nombre, c));

    const toCreate = names.filter((n) => !map.has(n));

    if (toCreate.length > 0) {
      const created = await Category.bulkCreate(
        toCreate.map((nombre) => ({ nombre })),
        { transaction: t }
      );
      created.forEach((c) => map.set(c.nombre, c));
    }

    return map;
  }

  private static async processSuppliers(
    rows: ExcelRow[],
    result: ImportResult,
    t: Transaction
  ): Promise<Map<string, Supplier>> {
    const map = new Map<string, Supplier>();
    const names = [...new Set(rows.map((r) => (r.proveedor || '').toString().trim()).filter(Boolean))];

    const existing = await Supplier.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });

    existing.forEach((s) => map.set(s.nombre, s));

    const toCreate = names.filter((n) => !map.has(n));

    if (toCreate.length > 0) {
      const created = await Supplier.bulkCreate(
        toCreate.map((nombre) => ({ 
          nombre, 
          ruc_dni: `TEMP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}` 
        })),
        { transaction: t }
      );
      created.forEach((s) => map.set(s.nombre, s));
      
      // Registrar proveedores con RUC temporal para notificación
      result.proveedoresConRUCTemporal!.push(...toCreate);
    }

    return map;
  }

  private static async processProducts(
    rows: ExcelRow[],
    categoryMap: Map<string, Category>,
    supplierMap: Map<string, Supplier>,
    result: ImportResult,
    t: Transaction
  ): Promise<Map<string, Product>> {
    const map = new Map<string, Product>();
    const skus = [...new Set(rows.map((r) => (r.sku || '').toString().trim()).filter(Boolean))];

    const existing = await Product.findAll({
      where: { codigo: { [Op.in]: skus } },
      include: [
        { model: Category, as: 'categoria' },
        { model: Supplier, as: 'proveedor' }
      ],
      transaction: t
    });

    existing.forEach((p) => map.set(p.codigo, p));

    for (const row of rows) {
      const sku = (row.sku || '').toString().trim();
      if (!sku || map.has(sku)) continue;

      const cat = categoryMap.get((row.categoria || '').toString().trim());
      const sup = supplierMap.get((row.proveedor || '').toString().trim());

      if (!cat || !sup) continue;

      const [created, wasCreated] = await Product.findOrCreate({
        where: { codigo: sku },
        defaults: {
          codigo: sku,
          nombre: (row['nombre producto'] || `Producto ${sku}`).toString().trim(),
          categoria_id: cat.id,
          proveedor_id: sup.id,
          precio_compra: parseFloat(String(row['costo unitario'])) || 0,
          precio_venta: parseFloat(String(row['precio venta unitario'])) || 0,
          stock_actual: 0,
          stock_minimo: 0
        },
        transaction: t
      });

      map.set(created.codigo, created);
      if (wasCreated) result.newProducts++;
    }

    return map;
  }

  private static async processSalidas(
    rows: ExcelRow[],
    productMap: Map<string, Product>,
    usuarioId: number,
    result: ImportResult,
    t: Transaction
  ): Promise<void> {
    // Agrupar por fecha para crear una SalidaInventario por día
    const byDate = new Map<string, Array<{ producto: Product; cantidad: number; precio: number; costo: number }>>();

    for (const row of rows) {
      const sku = (row.sku || '').toString().trim();
      const product = productMap.get(sku);
      if (!product) continue;

      let fecha: Date;
      try {
        fecha = new Date(row.fecha);
        if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
      } catch {
        result.errors.push(`SKU ${sku}: Fecha inválida`);
        continue;
      }

      const cantidad = parseInt(String(row['cantidad vendida']), 10) || 0;
      const precio = parseFloat(String(row['precio venta unitario'])) || 0;
      const costo = parseFloat(String(row['costo unitario'])) || 0;

      if (cantidad <= 0 || precio <= 0) {
        result.errors.push(`SKU ${sku}: Cantidad o precio inválido`);
        continue;
      }

      const key = fecha.toISOString().split('T')[0];
      if (!byDate.has(key)) byDate.set(key, []);
      
      const list = byDate.get(key)!;
      const existing = list.find((i) => i.producto.id === product.id);

      if (existing) {
        existing.cantidad += cantidad;
      } else {
        list.push({ producto: product, cantidad, precio, costo });
      }

      result.processedRows++;
    }

    for (const [dateStr, items] of byDate) {
      const total = items.reduce((s, i) => s + i.cantidad * i.precio, 0);

      const salida = await SalidaInventario.create(
        {
          numero_documento: `IMP-${dateStr.replace(/-/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fecha: new Date(dateStr),
          usuario_id: usuarioId,
          tipo_documento: 'boleta',
          total,
          metodo_pago: 'efectivo',
          estado: 'completado'
        },
        { transaction: t }
      );

      for (const item of items) {
        await DetalleSalida.create(
          {
            salida_id: salida.id,
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.cantidad * item.precio
          },
          { transaction: t }
        );
      }

      result.newSalidas++;
    }
  }
}
