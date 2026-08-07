import * as XLSX from 'xlsx';
import { sequelize } from '../config/database';
import { Transaction } from 'sequelize';
import Category from '../models/Category';
import Supplier from '../models/Supplier';
import Product from '../models/Product';
import UnidadMedida from '../models/UnidadMedida';
import Sede from '../models/Sede';
import Almacen from '../models/Almacen';
import Personal from '../models/Personal';
import Client from '../models/Client';
import EntradaInventario from '../models/EntradaInventario';
import DetalleEntrada from '../models/DetalleEntrada';
import SalidaInventario from '../models/SalidaInventario';
import DetalleSalida from '../models/DetalleSalida';
import MovimientoInventario from '../models/MovimientoInventario';
import StockPorSede from '../models/StockPorSede';
import DailySale from '../models/sales';
import { alertService } from './alertService';
import { Op } from 'sequelize';

const REQUIRED_COLUMNS = [
  'factura',
  'fecha',
  'operacion',
  'categoria',
  'proveedor',
  'producto',
  'sku',
  'unidad',
  'cantidad',
  'precio unitario',
  'precio compra',
  'cliente'
];

const COLUMN_ALIASES: Record<string, string[]> = {
  'factura': ['factura', 'documento', 'numero documento', 'numero_documento', 'invoice', 'ticket', 'venta_id'],
  'fecha': ['fecha', 'date'],
  'operacion': ['operacion', 'operation', 'tipo', 'type'],
  'categoria': ['categoria', 'categoría', 'category', 'categoría producto'],
  'proveedor': ['proveedor', 'supplier', 'proveedor nombre'],
  'producto': ['producto', 'nombre producto', 'product', 'nombre'],
  'sku': ['sku', 'código', 'codigo', 'product code', 'code'],
  'unidad': ['unidad', 'unit', 'medida', 'unit of measure'],
  'cantidad': ['cantidad', 'quantity', 'qty'],
  'precio unitario': ['precio unitario', 'precio venta', 'precio', 'price', 'precio unitario venta', 'pvp'],
  'precio compra': ['precio compra', 'costo unitario', 'costo', 'cost', 'costo unitario compra'],
  'sede': ['sede', 'location', 'local', 'tienda'],
  'almacen': ['almacen', 'almacén', 'warehouse'],
  'cliente': ['cliente', 'customer', 'client', 'cliente nombre'],
  'personal': ['personal', 'nombre personal', 'empleado', 'encargado', 'operador'],
  'telefono_personal': ['telefono personal', 'tel personal', 'telefono_personal'],
  'telefono_cliente': ['telefono cliente', 'tel cliente', 'telefono_cliente'],
  'dni_ruc_cliente': ['dni', 'dni cliente', 'ruc cliente', 'documento cliente', 'dni/ruc cliente', 'dni_ruc_cliente']
};

const UNIT_ABBREVIATIONS: Record<string, string> = {
  'unidad': 'Und',
  'caja': 'Cja',
  'juego': 'Jgo',
  'pieza': 'Pza',
  'par': 'Par',
  'docena': 'Doc',
  'docenas': 'Doc',
  'metro': 'Mts',
  'metros': 'Mts',
  'kilogramo': 'Kg',
  'kilogramos': 'Kg',
  'litro': 'Lts',
  'litros': 'Lts',
  'rollo': 'Rol',
  'fardo': 'Far',
  'atado': 'Atd',
  'manojo': 'Man',
  'bulto': 'Bul',
  'saco': 'Sac',
  'botella': 'Bot',
  'lata': 'Lat',
  'paquete': 'Paq',
  'servilleta': 'Serv',
  'hoja': 'Hoja',
  'tabla': 'Tab',
  'pie': 'Pie',
  'barra': 'Bar',
  'tubo': 'Tub',
  'placa': 'Pla',
  'lote': 'Lot',
  'global': 'Glob',
  'unidades': 'Und',
  'piezas': 'Pza',
  'juegos': 'Jgo'
};

function generateAbbreviation(unitName: string): string {
  const lower = unitName.toLowerCase().trim();
  if (UNIT_ABBREVIATIONS[lower]) {
    return UNIT_ABBREVIATIONS[lower];
  }
  return lower.slice(0, 3);
}

interface ExcelRow {
  [key: string]: any;
  factura: string;
  fecha: string | Date;
  operacion: string;
  categoria: string;
  proveedor: string;
  producto: string;
  sku: string;
  unidad: string;
  cantidad: number;
  'precio unitario': number;
  'precio compra': number;
  sede: string;
  almacen: string;
  cliente: string;
  personal?: string;
  'telefono_personal'?: string;
  'telefono_cliente'?: string;
  'dni_ruc_cliente'?: string;
}

export interface ImportResult {
  totalRows: number;
  processedRows: number;
  newCategories: number;
  newSuppliers: number;
  newProducts: number;
  newUnits: number;
  newSedes: number;
  newAlmacenes: number;
  newClients: number;
  newPersonal: number;
  newEntradas: number;
  newSalidas: number;
  errors: string[];
  warnings: string[];
}

const BATCH_SIZE = 500; // Lotes de 500 facturas

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
      newUnits: 0,
      newSedes: 0,
      newAlmacenes: 0,
      newClients: 0,
      newPersonal: 0,
      newEntradas: 0,
      newSalidas: 0,
      errors: [],
      warnings: []
    };

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (rows.length === 0) {
        throw new Error('El archivo Excel está vacío');
      }

      result.totalRows = rows.length;

      const columnNames = Object.keys(rows[0])
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k && k !== '__empty' && k !== 'undefined' && k !== 'null');

      const hasColumn = (requiredColumn: string): boolean => {
        const aliases = COLUMN_ALIASES[requiredColumn] || [requiredColumn];
        return aliases.some((alias: string) => columnNames.includes(alias.toLowerCase()));
      };

      const missing = REQUIRED_COLUMNS.filter(col => !hasColumn(col));

      if (missing.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`);
      }

      const normalizedRows = rows.map((row) => {
        const n: any = {};
        Object.entries(row).forEach(([k, v]) => {
          const key = k.toLowerCase().trim();
          if (key && key !== '__empty' && key !== 'undefined' && key !== 'null' && !/^\d+$/.test(key)) {
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

      // FASE 1: Procesar entidades en 1 transacción (categorías, proveedores, etc.)
      let categoryMap: Map<string, Category>;
      let supplierMap: Map<string, Supplier>;
      let unitMap: Map<string, UnidadMedida>;
      let sedeMap: Map<string, Sede>;
      let almacenMap: Map<string, Almacen>;
      let productMap: Map<string, Product>;
      let clientMap: Map<string, Client>;

      await sequelize.transaction(async (t) => {
        categoryMap = await this.processCategories(normalizedRows, t, result);
        supplierMap = await this.processSuppliers(normalizedRows, t, result);
        unitMap = await this.processUnits(normalizedRows, t, result);
        sedeMap = await this.processSedes(normalizedRows, t, result);
        almacenMap = await this.processAlmacenes(normalizedRows, t, result);
        productMap = await this.processProducts(
          normalizedRows, categoryMap, supplierMap, unitMap, t, result
        );
        clientMap = await this.processClients(normalizedRows, t, result);
        await this.processPersonal(normalizedRows, t, result);
      });

      // FASE 2: Procesar operaciones por lotes
      await this.processOperationsInBatches(
        normalizedRows, productMap!, supplierMap!, clientMap!, sedeMap!, almacenMap!,
        usuarioId, result
      );

      // FASE 3: Actualizar stocks finales
      await this.updateProductStocks(productMap!);

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(msg);
    }
  }

  private static async processOperationsInBatches(
    rows: ExcelRow[],
    productMap: Map<string, Product>,
    supplierMap: Map<string, Supplier>,
    clientMap: Map<string, Client>,
    sedeMap: Map<string, Sede>,
    almacenMap: Map<string, Almacen>,
    usuarioId: number,
    result: ImportResult
  ): Promise<void> {
    // Agrupar por factura
    const sortedRows = [...rows].sort((a, b) => {
      const da = new Date(a.fecha).getTime();
      const db = new Date(b.fecha).getTime();
      return da - db;
    });

    const facturas = new Map<string, ExcelRow[]>();
    for (const row of sortedRows) {
      const factura = (row.factura || '').toString().trim();
      if (!factura) continue;
      if (!facturas.has(factura)) facturas.set(factura, []);
      facturas.get(factura)!.push(row);
    }

    const facturaEntries = Array.from(facturas.entries());
    const totalBatches = Math.ceil(facturaEntries.length / BATCH_SIZE);

    console.log(`Procesando ${facturaEntries.length} facturas en ${totalBatches} lotes...`);

    // Procesar cada lote en su propia transacción
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, facturaEntries.length);
      const batch = facturaEntries.slice(start, end);

      console.log(`Lote ${batchIndex + 1}/${totalBatches}: procesando ${batch.length} facturas...`);

      // Collect product IDs from compras in this batch for alert resolution
      const comprasProductIds: number[] = [];

      await sequelize.transaction(async (t) => {
        for (const [factura, facturaRows] of batch) {
          const op = (facturaRows[0].operacion || '').toString().trim().toLowerCase();

          if (op === 'compra') {
            await this.processCompra(factura, facturaRows, productMap, supplierMap, sedeMap, almacenMap, usuarioId, t, result);
            // Collect product IDs from this compra
            for (const row of facturaRows) {
              const sku = (row.sku || '').toString().trim();
              const product = productMap.get(sku.toLowerCase());
              if (product && !comprasProductIds.includes(product.id)) {
                comprasProductIds.push(product.id);
              }
            }
          } else if (op === 'venta') {
            await this.processVenta(factura, facturaRows, productMap, clientMap, usuarioId, t, result);
          } else {
            result.errors.push(`Factura ${factura}: Operación "${facturaRows[0].operacion}" no válida (use "compra" o "venta")`);
          }
        }
      });

      // Auto-resolve alerts for products that were purchased
      for (const productId of comprasProductIds) {
        await alertService.resolveAlertsForProduct(productId);
      }

      console.log(`Lote ${batchIndex + 1}/${totalBatches} completado (${result.processedRows} filas procesadas)`);
    }
  }

  private static async processCategories(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<Map<string, Category>> {
    const map = new Map<string, Category>();
    const names = [...new Set(rows.map((r) => (r.categoria || '').toString().trim()).filter(Boolean))];

    const existing = await Category.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });
    existing.forEach((c) => map.set(c.nombre.toLowerCase(), c));

    const toCreate = names.filter((n) => !map.has(n.toLowerCase()));
    if (toCreate.length > 0) {
      const created = await Category.bulkCreate(
        toCreate.map((nombre) => ({ nombre })),
        { transaction: t }
      );
      created.forEach((c) => map.set(c.nombre.toLowerCase(), c));
      result.newCategories = created.length;
    }

    return map;
  }

  private static async processSuppliers(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<Map<string, Supplier>> {
    const map = new Map<string, Supplier>();
    const names = [...new Set(rows.map((r) => (r.proveedor || '').toString().trim()).filter(Boolean))];

    const existing = await Supplier.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });
    existing.forEach((s) => map.set(s.nombre.toLowerCase(), s));

    const toCreate = names.filter((n) => !map.has(n.toLowerCase()));
    if (toCreate.length > 0) {
      const created = await Supplier.bulkCreate(
        toCreate.map((nombre) => ({
          nombre,
          ruc_dni: `TEMP${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2, 6)}`
        })),
        { transaction: t }
      );
      created.forEach((s) => map.set(s.nombre.toLowerCase(), s));
      result.newSuppliers = created.length;
      result.warnings.push(
        `Proveedores creados con RUC temporal: ${toCreate.join(', ')}`
      );
    }

    return map;
  }

  private static async processUnits(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<Map<string, UnidadMedida>> {
    const map = new Map<string, UnidadMedida>();
    const names = [...new Set(rows.map((r) => (r.unidad || '').toString().trim()).filter(Boolean))];

    const existing = await UnidadMedida.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });
    existing.forEach((u) => map.set(u.nombre.toLowerCase(), u));

    const toCreate = names.filter((n) => !map.has(n.toLowerCase()));
    if (toCreate.length > 0) {
      const created = await UnidadMedida.bulkCreate(
        toCreate.map((nombre) => ({
          nombre,
          abreviatura: generateAbbreviation(nombre)
        })),
        { transaction: t }
      );
      created.forEach((u) => map.set(u.nombre.toLowerCase(), u));
      result.newUnits = created.length;
    }

    return map;
  }

  private static async processSedes(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<Map<string, Sede>> {
    const map = new Map<string, Sede>();
    const names = [...new Set(rows.map((r) => (r.sede || '').toString().trim()).filter(Boolean))];

    const existing = await Sede.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });
    existing.forEach((s) => map.set(s.nombre.toLowerCase(), s));

    const toCreate = names.filter((n) => !map.has(n.toLowerCase()));
    if (toCreate.length > 0) {
      const created = await Sede.bulkCreate(
        toCreate.map((nombre) => ({
          nombre,
          tipo: 'tienda' as const,
          direccion: 'Dirección no especificada'
        })),
        { transaction: t }
      );
      created.forEach((s) => map.set(s.nombre.toLowerCase(), s));
      result.newSedes = created.length;
    }

    return map;
  }

  private static async processAlmacenes(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<Map<string, Almacen>> {
    const map = new Map<string, Almacen>();
    const names = [...new Set(rows.map((r) => (r.almacen || '').toString().trim()).filter(Boolean))];

    const existing = await Almacen.findAll({
      where: { nombre: { [Op.in]: names } },
      transaction: t
    });
    existing.forEach((a) => map.set(a.nombre.toLowerCase(), a));

    const toCreate = names.filter((n) => !map.has(n.toLowerCase()));
    if (toCreate.length > 0) {
      let counter = (await Almacen.count({ transaction: t })) + 1;
      const created: Almacen[] = [];
      for (const nombre of toCreate) {
        const alm = await Almacen.create({
          nombre,
          codigo: `ALM-${String(counter).padStart(3, '0')}`,
          tipo: 'secundario' as const
        }, { transaction: t });
        created.push(alm);
        counter++;
      }
      created.forEach((a) => map.set(a.nombre.toLowerCase(), a));
      result.newAlmacenes = created.length;
    }

    return map;
  }

  private static async processProducts(
    rows: ExcelRow[],
    categoryMap: Map<string, Category>,
    supplierMap: Map<string, Supplier>,
    unitMap: Map<string, UnidadMedida>,
    t: Transaction,
    result: ImportResult
  ): Promise<Map<string, Product>> {
    const map = new Map<string, Product>();
    const skus = [...new Set(rows.map((r) => (r.sku || '').toString().trim()).filter(Boolean))];

    const existing = await Product.findAll({
      where: { codigo: { [Op.in]: skus } },
      transaction: t
    });
    existing.forEach((p) => map.set(p.codigo.toLowerCase(), p));

    for (const sku of skus) {
      const lowerSku = sku.toLowerCase();
      if (map.has(lowerSku)) continue;

      const row = rows.find((r) => (r.sku || '').toString().trim().toLowerCase() === lowerSku);
      if (!row) continue;

      const cat = categoryMap.get((row.categoria || '').toString().trim().toLowerCase());
      const sup = supplierMap.get((row.proveedor || '').toString().trim().toLowerCase());
      const unit = unitMap.get((row.unidad || '').toString().trim().toLowerCase());

      if (!cat) {
        result.errors.push(`SKU ${sku}: Categoría "${row.categoria}" no encontrada`);
        continue;
      }

      const [created, wasCreated] = await Product.findOrCreate({
        where: { codigo: sku },
        defaults: {
          codigo: sku,
          nombre: (row.producto || `Producto ${sku}`).toString().trim(),
          categoria_id: cat.id,
          proveedor_id: sup?.id,
          unidad_id: unit?.id,
          precio_compra: parseFloat(String(row['precio compra'])) || 0,
          precio_venta: parseFloat(String(row['precio unitario'])) || 0,
          stock_actual: 0,
          stock_minimo: 0
        },
        transaction: t
      });

      map.set(lowerSku, created);
      if (wasCreated) result.newProducts++;
    }

    return map;
  }

  private static async processClients(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<Map<string, Client>> {
    const map = new Map<string, Client>();

    const ventaRows = rows.filter((r) => (r.operacion || '').toString().trim().toLowerCase() === 'venta');

    const clientDataMap = new Map<string, { telefono: string; dni: string }>();
    for (const r of ventaRows) {
      const nombre = (r.cliente || '').toString().trim();
      if (!nombre) continue;
      const key = nombre.toLowerCase();
      if (!clientDataMap.has(key)) {
        clientDataMap.set(key, {
          telefono: (r['telefono_cliente'] || '').toString().trim(),
          dni: (r['dni_ruc_cliente'] || '').toString().trim()
        });
      }
    }

    const clientNames = [...clientDataMap.keys()];
    if (clientNames.length === 0) return map;

    const existing = await Client.findAll({
      where: { nombre: { [Op.in]: clientNames.map(n => n) } },
      transaction: t
    });
    existing.forEach((c) => map.set(c.nombre.toLowerCase(), c));

    const toCreate = clientNames.filter((n) => !map.has(n));
    if (toCreate.length > 0) {
      let counter = (await Client.count({ transaction: t })) + 1;
      const created: Client[] = [];
      for (const nombre of toCreate) {
        const data = clientDataMap.get(nombre)!;
        const docLimpio = data.dni.replace(/\D/g, '');
        let tipo_documento: 'DNI' | 'RUC' = 'DNI';
        let numero_documento: string;

        if (/^\d{11}$/.test(docLimpio)) {
          tipo_documento = 'RUC';
          numero_documento = docLimpio;
        } else if (/^\d{8}$/.test(docLimpio)) {
          tipo_documento = 'DNI';
          numero_documento = docLimpio;
        } else {
          tipo_documento = 'DNI';
          numero_documento = String(counter).padStart(8, '0');
        }

        const telefono = data.telefono && data.telefono.length >= 7 ? data.telefono : '000000000';

        const cliente = await Client.create({
          nombre,
          tipo_documento,
          numero_documento,
          telefono
        }, { transaction: t });
        created.push(cliente);
        counter++;
      }
      created.forEach((c) => map.set(c.nombre.toLowerCase(), c));
      result.newClients = created.length;
      result.warnings.push(
        `Clientes creados: ${toCreate.join(', ')}. Verifique sus datos después.`
      );
    }

    return map;
  }

  private static async processPersonal(
    rows: ExcelRow[], t: Transaction, result: ImportResult
  ): Promise<void> {
    const personalDataMap = new Map<string, { operacion: string; telefono: string }>();
    for (const r of rows) {
      const nombre = (r.personal || '').toString().trim();
      if (!nombre) continue;
      const key = nombre.toLowerCase();
      if (!personalDataMap.has(key)) {
        personalDataMap.set(key, {
          operacion: (r.operacion || '').toString().trim().toLowerCase(),
          telefono: (r['telefono_personal'] || '').toString().trim()
        });
      }
    }

    if (personalDataMap.size === 0) return;

    const names = [...personalDataMap.keys()];
    const existing = await Personal.findAll({
      where: { nombreCompleto: { [Op.in]: names.map(n => n) } },
      transaction: t
    });
    const existingMap = new Map(existing.map(p => [p.nombreCompleto.toLowerCase(), p]));

    for (const [nombre, data] of personalDataMap) {
      if (existingMap.has(nombre)) continue;

      const cargo = data.operacion === 'venta' ? 'Repartidor' : 'Almacenero';
      const telefono = data.telefono.length >= 7 ? data.telefono : undefined;
      await Personal.create({
        nombreCompleto: nombre,
        cargo,
        telefono,
        activo: true
      }, { transaction: t });
      result.newPersonal++;
    }
  }

  private static async processCompra(
    factura: string,
    rows: ExcelRow[],
    productMap: Map<string, Product>,
    supplierMap: Map<string, Supplier>,
    sedeMap: Map<string, Sede>,
    almacenMap: Map<string, Almacen>,
    usuarioId: number,
    t: Transaction,
    result: ImportResult
  ): Promise<void> {
    const firstRow = rows[0];
    const proveedorNombre = (firstRow.proveedor || '').toString().trim();
    const sedeNombre = (firstRow.sede || '').toString().trim();
    const almacenNombre = (firstRow.almacen || '').toString().trim();

    if (!proveedorNombre) {
      result.errors.push(`Factura ${factura}: Falta proveedor (compra requiere proveedor)`);
      return;
    }
    if (!sedeNombre && !almacenNombre) {
      result.errors.push(`Factura ${factura}: Falta sede o almacén (compra requiere un destino)`);
      return;
    }

    const supplier = supplierMap.get(proveedorNombre.toLowerCase());
    if (!supplier) {
      result.errors.push(`Factura ${factura}: Proveedor "${proveedorNombre}" no encontrado`);
      return;
    }

    let fecha: Date;
    try {
      fecha = new Date(firstRow.fecha);
      if (isNaN(fecha.getTime())) throw new Error();
    } catch {
      result.errors.push(`Factura ${factura}: Fecha inválida`);
      return;
    }

    let total = 0;
    const items: Array<{ producto: Product; cantidad: number; precio: number }> = [];

    for (const row of rows) {
      const sku = (row.sku || '').toString().trim();
      const product = productMap.get(sku.toLowerCase());
      if (!product) {
        result.errors.push(`Factura ${factura}: SKU "${sku}" no encontrado`);
        continue;
      }

      const cantidad = parseInt(String(row.cantidad), 10) || 0;
      const precio = parseFloat(String(row['precio compra'])) || 0;

      if (cantidad <= 0) {
        result.errors.push(`Factura ${factura}: SKU ${sku} cantidad inválida`);
        continue;
      }

      total += cantidad * precio;
      items.push({ producto: product, cantidad, precio });
    }

    if (items.length === 0) return;

    const entrada = await EntradaInventario.create({
      numero_documento: `IMP-C-${factura.replace(/\s/g, '')}-${Date.now()}`,
      fecha,
      proveedor_id: supplier.id,
      usuario_id: usuarioId,
      tipo_documento: 'factura',
      total,
      forma_pago: 'contado',
      estado: 'pagado'
    }, { transaction: t });

    for (const item of items) {
      await DetalleEntrada.create({
        entrada_id: entrada.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.cantidad * item.precio
      }, { transaction: t });

      const stockAnterior = item.producto.stock_actual;
      const stockNuevo = stockAnterior + item.cantidad;

      await MovimientoInventario.create({
        producto_id: item.producto.id,
        tipo_movimiento: 'entrada',
        referencia_id: entrada.id,
        tipo_referencia: 'compra',
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        usuario_id: usuarioId,
        fecha,
        motivo: `Importación compra ${factura}`,
        sede_destino: (firstRow.sede || '').toString().trim() || undefined,
        responsable: (firstRow.personal || '').toString().trim() || undefined
      }, { transaction: t });

      await item.producto.update({ stock_actual: stockNuevo }, { transaction: t });

      // Actualizar StockPorSede
      const sedeNombre2 = (firstRow.sede || '').toString().trim();
      const almacenNombre2 = (firstRow.almacen || '').toString().trim();
      const sede = sedeNombre2 ? sedeMap.get(sedeNombre2.toLowerCase()) : undefined;
      const almacen = almacenNombre2 ? almacenMap.get(almacenNombre2.toLowerCase()) : undefined;

      if (sede && almacen) {
        // Caso: sede + almacén juntos
        const [stockSede] = await StockPorSede.findOrCreate({
          where: { producto_id: item.producto.id, sede_id: sede.id, almacen_id: almacen.id },
          defaults: {
            producto_id: item.producto.id,
            sede_id: sede.id,
            almacen_id: almacen.id,
            cantidad_actual: 0,
            stock_minimo: item.producto.stock_minimo,
            ultimo_movimiento: new Date()
          },
          transaction: t
        });
        await stockSede.update({
          cantidad_actual: stockSede.cantidad_actual + item.cantidad,
          ultimo_movimiento: new Date()
        }, { transaction: t });
      } else if (sede) {
        // Caso: solo sede
        const [stockSede] = await StockPorSede.findOrCreate({
          where: { producto_id: item.producto.id, sede_id: sede.id },
          defaults: {
            producto_id: item.producto.id,
            sede_id: sede.id,
            cantidad_actual: 0,
            stock_minimo: item.producto.stock_minimo,
            ultimo_movimiento: new Date()
          },
          transaction: t
        });
        await stockSede.update({
          cantidad_actual: stockSede.cantidad_actual + item.cantidad,
          ultimo_movimiento: new Date()
        }, { transaction: t });
      } else if (almacen) {
        // Caso: solo almacén (usar sede por defecto)
        const defaultSede = await Sede.findOne({ where: { estado: 'activo' }, order: [['id', 'ASC']], transaction: t });
        if (defaultSede) {
          const [stockSede] = await StockPorSede.findOrCreate({
            where: { producto_id: item.producto.id, sede_id: defaultSede.id, almacen_id: almacen.id },
            defaults: {
              producto_id: item.producto.id,
              sede_id: defaultSede.id,
              almacen_id: almacen.id,
              cantidad_actual: 0,
              stock_minimo: item.producto.stock_minimo,
              ultimo_movimiento: new Date()
            },
            transaction: t
          });
          await stockSede.update({
            cantidad_actual: stockSede.cantidad_actual + item.cantidad,
            ultimo_movimiento: new Date()
          }, { transaction: t });
        }
      }

      result.processedRows++;
    }

    result.newEntradas++;
  }

  private static async processVenta(
    factura: string,
    rows: ExcelRow[],
    productMap: Map<string, Product>,
    clientMap: Map<string, Client>,
    usuarioId: number,
    t: Transaction,
    result: ImportResult
  ): Promise<void> {
    const firstRow = rows[0];
    const clienteNombre = (firstRow.cliente || '').toString().trim();

    if (!clienteNombre) {
      result.errors.push(`Factura ${factura}: Falta cliente (venta requiere cliente)`);
      return;
    }

    let fecha: Date;
    try {
      fecha = new Date(firstRow.fecha);
      if (isNaN(fecha.getTime())) throw new Error();
    } catch {
      result.errors.push(`Factura ${factura}: Fecha inválida`);
      return;
    }

    const client = clientMap.get(clienteNombre.toLowerCase());

    let total = 0;
    const items: Array<{ producto: Product; cantidad: number; precio: number; costo: number }> = [];

    for (const row of rows) {
      const sku = (row.sku || '').toString().trim();
      const product = productMap.get(sku.toLowerCase());
      if (!product) {
        result.errors.push(`Factura ${factura}: SKU "${sku}" no encontrado`);
        continue;
      }

      const cantidad = parseInt(String(row.cantidad), 10) || 0;
      const precio = parseFloat(String(row['precio unitario'])) || 0;
      const costo = parseFloat(String(row['precio compra'])) || product.precio_compra || 0;

      if (cantidad <= 0 || precio <= 0) {
        result.errors.push(`Factura ${factura}: SKU ${sku} cantidad o precio inválido`);
        continue;
      }

      total += cantidad * precio;
      items.push({ producto: product, cantidad, precio, costo });
    }

    if (items.length === 0) return;

    const salida = await SalidaInventario.create({
      numero_documento: `IMP-V-${factura.replace(/\s/g, '')}-${Date.now()}`,
      fecha,
      cliente_nombre: clienteNombre,
      cliente_documento: client?.numero_documento,
      usuario_id: usuarioId,
      tipo_documento: 'boleta',
      total,
      metodo_pago: 'efectivo',
      estado: 'completado'
    }, { transaction: t });

    for (const item of items) {
      await DetalleSalida.create({
        salida_id: salida.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.cantidad * item.precio
      }, { transaction: t });

      const stockAnterior = item.producto.stock_actual;
      const stockNuevo = Math.max(0, stockAnterior - item.cantidad);

      await MovimientoInventario.create({
        producto_id: item.producto.id,
        tipo_movimiento: 'salida',
        referencia_id: salida.id,
        tipo_referencia: 'venta',
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        usuario_id: usuarioId,
        fecha,
        motivo: `Importación venta ${factura}`,
        sede_origen: (firstRow.sede || '').toString().trim() || undefined,
        responsable: (firstRow.personal || '').toString().trim() || undefined
      }, { transaction: t });

      await item.producto.update({ stock_actual: stockNuevo }, { transaction: t });

      // Actualizar StockPorSede (usar sede por defecto para ventas)
      const defaultSede = await Sede.findOne({ where: { estado: 'activo' }, order: [['id', 'ASC']], transaction: t });
      if (defaultSede) {
        const stockSede = await StockPorSede.findOne({
          where: { producto_id: item.producto.id, sede_id: defaultSede.id },
          transaction: t
        });
        if (stockSede) {
          await stockSede.update({
            cantidad_actual: Math.max(0, stockSede.cantidad_actual - item.cantidad),
            ultimo_movimiento: new Date()
          }, { transaction: t });
        }
      }

      const dateStr = fecha.toISOString().split('T')[0];
      const profit = item.cantidad * (item.precio - item.costo);

      await DailySale.upsert({
        date: new Date(dateStr),
        productId: item.producto.id,
        quantity: item.cantidad,
        unitPrice: item.precio,
        totalAmount: item.cantidad * item.precio,
        costPrice: item.costo,
        profit
      }, { transaction: t });

      result.processedRows++;
    }

    result.newSalidas++;
  }

  private static async updateProductStocks(
    productMap: Map<string, Product>
  ): Promise<void> {
    for (const [, product] of productMap) {
      const stock = Math.max(0, product.stock_actual);
      await product.update({ stock_actual: stock });
    }
  }
}
