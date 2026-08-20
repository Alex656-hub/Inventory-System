// backend/src/services/ReportService.ts
import PDFKit from 'pdfkit';
import * as ExcelJS from 'exceljs';
import {
  ReportParams,
  InventoryReportData,
  DemandForecastReportData,
  StockMovementsReportData,
  FinancialKpisReportData
} from '../types/reports';

interface KardexData {
  producto: {
    id: number;
    codigo: string;
    nombre: string;
    categoria?: string;
  };
  periodo: {
    desde: string;
    hasta: string;
  };
  kardex: Array<{
    fecha: Date | string;
    tipo_movimiento: string;
    referencia?: string;
    entrada_cantidad: number;
    entrada_costo_unitario: number;
    entrada_precio_lista?: number;
    entrada_descuento?: number;
    entrada_valor_total: number;
    salida_cantidad: number;
    salida_costo_unitario: number;
    salida_precio_lista?: number;
    salida_descuento?: number;
    salida_valor_total: number;
    saldo_cantidad: number;
    saldo_costo_unitario: number;
    saldo_valor_total: number;
  }>;
  resumen: {
    total_entradas: number;
    total_salidas: number;
  };
}

interface InventarioData {
  productos: Array<{
    codigo: string;
    nombre: string;
    categoria: string;
    sede: string;
    almacen: string;
    stock_actual: number;
    unidad: string;
    costo_unitario: number;
    valor_total: number;
    descuento_promocion?: number;
    precio_venta?: number;
    precio_promo?: number | null;
    valor_promo?: number | null;
  }>;
}

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

  async generateKardexPDF(data: KardexData): Promise<Buffer> {
    const doc = new PDFKit({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Título
    doc.fontSize(16).font('Helvetica-Bold').text('Kardex Físico Valorizado', { align: 'center' });
    doc.moveDown(0.5);

    // Información del producto y período
    doc.fontSize(11).font('Helvetica');
    doc.text(`Producto: [${data.producto.codigo}] ${data.producto.nombre}`, { align: 'left' });
    doc.text(`Período: ${data.periodo.desde} al ${data.periodo.hasta}`, { align: 'left' });
    doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, { align: 'left' });
    doc.moveDown(1);

    // Encabezados de tabla - con columnas de Precio Lista y Desc.%
    const tableTop = doc.y;
    const colWidths = [50, 50, 40, 60, 60, 35, 50, 40, 50, 50, 50];
    const headers = ['Fecha', 'Tipo', 'Mov.ID', 'Sede Origen', 'Destino', 'Cant.', 'Precio Lista', 'Desc.%', 'Precio Final', 'Saldo Cant.', 'Saldo Costo'];
    
    // Dibujar cabecera
    doc.fillColor('#1e3a8a').rect(50, tableTop, 515, 20).fill();
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    
    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: i >= 5 ? 'right' : 'left' });
      xPos += colWidths[i];
    });

    // Filas de datos
    doc.fillColor('black').font('Helvetica').fontSize(7);
    let yPos = tableTop + 25;
    
    let totalEntradas = 0;
    let totalSalidas = 0;

    data.kardex.forEach((mov, index) => {
      // Alternar colores de fila
      if (index % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, yPos - 3, 515, 15).fill();
      } else {
        doc.fillColor('white').rect(50, yPos - 3, 515, 15).fill();
      }
      doc.fillColor('black');

      const fechaStr = new Date(mov.fecha).toLocaleDateString('es-PE');
      const tipoStr = mov.tipo_movimiento.toUpperCase();
      const movId = mov.referencia ? `#${mov.referencia}` : '-';
      
      // Calcular sede origen y destino
      const sedeOrigen = mov.tipo_movimiento === 'salida' || mov.tipo_movimiento === 'ajuste' ? 'Almacén Origen' : '-';
      const destino = mov.tipo_movimiento === 'entrada' || mov.tipo_movimiento === 'ajuste' ? 'Almacén Destino' : '-';

      const esEntrada = mov.tipo_movimiento === 'entrada';
      const cantidad = esEntrada ? mov.entrada_cantidad : mov.salida_cantidad;
      const precioLista = esEntrada ? (mov.entrada_precio_lista || 0) : (mov.salida_precio_lista || 0);
      const descuento = esEntrada ? (mov.entrada_descuento || 0) : (mov.salida_descuento || 0);
      const precioFinal = esEntrada ? mov.entrada_costo_unitario : mov.salida_costo_unitario;
      const saldoCant = mov.saldo_cantidad;
      const saldoCosto = mov.saldo_costo_unitario;

      xPos = 55;
      doc.text(fechaStr, xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];
      doc.text(tipoStr, xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];
      doc.text(movId, xPos, yPos, { width: colWidths[2] });
      xPos += colWidths[2];
      doc.text(sedeOrigen, xPos, yPos, { width: colWidths[3] });
      xPos += colWidths[3];
      doc.text(destino, xPos, yPos, { width: colWidths[4] });
      xPos += colWidths[4];
      doc.text(String(cantidad), xPos, yPos, { width: colWidths[5], align: 'right' });
      xPos += colWidths[5];
      doc.text(`S/ ${precioLista.toFixed(2)}`, xPos, yPos, { width: colWidths[6], align: 'right' });
      xPos += colWidths[6];
      doc.text(`${descuento > 0 ? descuento.toFixed(2) : '-'}%`, xPos, yPos, { width: colWidths[7], align: 'right' });
      xPos += colWidths[7];
      doc.text(`S/ ${precioFinal.toFixed(2)}`, xPos, yPos, { width: colWidths[8], align: 'right' });
      xPos += colWidths[8];
      doc.text(String(saldoCant), xPos, yPos, { width: colWidths[9], align: 'right' });
      xPos += colWidths[9];
      doc.text(`S/ ${saldoCosto.toFixed(2)}`, xPos, yPos, { width: colWidths[10], align: 'right' });

      totalEntradas += mov.entrada_cantidad;
      totalSalidas += mov.salida_cantidad;

      yPos += 15;

      // Nueva página si es necesario
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    // Fila de resumen
    yPos += 5;
    doc.fillColor('#dbeafe').rect(50, yPos - 3, 515, 18).fill();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('RESUMEN', 55, yPos, { width: 100 });
    doc.text(`Entradas: ${totalEntradas}`, 350, yPos, { width: 80, align: 'right' });
    doc.text(`Salidas: ${totalSalidas}`, 430, yPos, { width: 80, align: 'right' });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  async generateInventarioExcel(data: InventarioData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CREDISA Inventory System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Inventario');

    // Encabezados
    worksheet.columns = [
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Producto', key: 'nombre', width: 35 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Sede/Almacén', key: 'sede', width: 25 },
      { header: 'Stock Actual', key: 'stock_actual', width: 15 },
      { header: 'Unidad', key: 'unidad', width: 12 },
      { header: 'Costo Unitario', key: 'costo_unitario', width: 15 },
      { header: 'Valor Total', key: 'valor_total', width: 15 },
      { header: 'Promo %', key: 'descuento_promocion', width: 10 },
      { header: 'Precio Venta', key: 'precio_venta', width: 15 },
      { header: 'Precio Promo', key: 'precio_promo', width: 15 },
      { header: 'Valor a Promo', key: 'valor_promo', width: 15 }
    ];

    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1e3a8a' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    // Agregar datos
    data.productos.forEach((producto) => {
      worksheet.addRow({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria,
        sede: `${producto.sede} / ${producto.almacen}`,
        stock_actual: producto.stock_actual,
        unidad: producto.unidad,
        costo_unitario: producto.costo_unitario,
        valor_total: producto.valor_total,
        descuento_promocion: producto.descuento_promocion || 0,
        precio_venta: producto.precio_venta || 0,
        precio_promo: producto.precio_promo ?? '',
        valor_promo: producto.valor_promo ?? ''
      });
    });

    // Formato de números
    worksheet.getColumn('stock_actual').numFmt = '#,##0';
    worksheet.getColumn('costo_unitario').numFmt = '#,##0.00';
    worksheet.getColumn('valor_total').numFmt = '#,##0.00';
    worksheet.getColumn('precio_venta').numFmt = '#,##0.00';
    worksheet.getColumn('precio_promo').numFmt = '#,##0.00';
    worksheet.getColumn('valor_promo').numFmt = '#,##0.00';

    return workbook.xlsx.writeBuffer() as any;
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

  async generateOperacionesExcel(operaciones: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Operaciones de Stock');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 16 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Sede Origen', key: 'sedeOrigen', width: 22 },
      { header: 'Sede Destino', key: 'sedeDestino', width: 22 },
      { header: 'Proveedor/Cliente', key: 'tercero', width: 25 },
      { header: 'Unidades', key: 'unidades', width: 12 },
      { header: 'Costo Total (S/)', key: 'costoTotal', width: 18 },
      { header: 'Referencia', key: 'referencia', width: 20 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    headerRow.alignment = { horizontal: 'center' };

    for (const op of operaciones) {
      worksheet.addRow({
        fecha: new Date(op.fecha_emision).toLocaleDateString('es-PE'),
        tipo: op.tipo_operacion,
        estado: op.estado,
        sedeOrigen: op.sede_origen?.nombre || '-',
        sedeDestino: op.sede_destino?.nombre || '-',
        tercero: op.proveedor?.nombre || op.cliente?.nombre || '-',
        unidades: op.total_unidades,
        costoTotal: Number(op.costo_total) || 0,
        referencia: op.referencia || '-'
      });
    }

    worksheet.getColumn('costoTotal').numFmt = '#,##0.00';

    return workbook.xlsx.writeBuffer() as any;
  }

  async generateDemandForecastPDF(data: DemandForecastReportData): Promise<Buffer> {
    const doc = new PDFKit({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(16).font('Helvetica-Bold').text('Predicciones de Demanda', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Periodo pronosticado: ${data.periodo} semanas`, { align: 'left' });
    doc.text(`Generado: ${new Date(data.generatedAt).toLocaleString('es-PE')}`, { align: 'left' });
    doc.moveDown(1);

    const tableTop = doc.y;
    const colWidths = [50, 145, 55, 60, 55, 55, 45];
    const headers = ['Código', 'Producto', 'Ventas 5 sem', 'Pronóstico', 'Lím. Inf', 'Lím. Sup', 'MAPE %'];

    doc.fillColor('#1e3a8a').rect(50, tableTop, 465, 20).fill();
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');

    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' });
      xPos += colWidths[i];
    });

    doc.fillColor('black').font('Helvetica').fontSize(7);
    let yPos = tableTop + 25;

    let totalVentas = 0;
    let totalPronostico = 0;

    data.productos.forEach((prod, index) => {
      if (index % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, yPos - 3, 465, 15).fill();
      } else {
        doc.fillColor('white').rect(50, yPos - 3, 465, 15).fill();
      }
      doc.fillColor('black');

      xPos = 55;
      doc.text(prod.codigo, xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];
      doc.text(prod.nombre, xPos, yPos, { width: colWidths[1], ellipsis: true });
      xPos += colWidths[1];
      doc.text(String(prod.ventas_30d), xPos, yPos, { width: colWidths[2], align: 'right' });
      xPos += colWidths[2];
      doc.text(String(prod.pronostico_30d), xPos, yPos, { width: colWidths[3], align: 'right' });
      xPos += colWidths[3];
      doc.text(String(prod.limite_inferior), xPos, yPos, { width: colWidths[4], align: 'right' });
      xPos += colWidths[4];
      doc.text(String(prod.limite_superior), xPos, yPos, { width: colWidths[5], align: 'right' });
      xPos += colWidths[5];
      doc.text(prod.mape !== null ? prod.mape.toFixed(1) : '—', xPos, yPos, { width: colWidths[6], align: 'right' });

      totalVentas += prod.ventas_30d;
      totalPronostico += prod.pronostico_30d;

      yPos += 15;
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    yPos += 5;
    doc.fillColor('#dbeafe').rect(50, yPos - 3, 465, 18).fill();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTALES', 55, yPos, { width: 100 });
    doc.text(String(totalVentas), 205, yPos, { width: 55, align: 'right' });
    doc.text(String(totalPronostico), 260, yPos, { width: 60, align: 'right' });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  async generateDemandForecastExcel(data: DemandForecastReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CREDISA Inventory System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Predicciones de Demanda');

    worksheet.columns = [
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Producto', key: 'nombre', width: 35 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Ventas (5 sem)', key: 'ventas_30d', width: 15 },
      { header: 'Pronóstico (5 sem)', key: 'pronostico_30d', width: 17 },
      { header: 'Límite Inferior', key: 'limite_inferior', width: 15 },
      { header: 'Límite Superior', key: 'limite_superior', width: 15 },
      { header: 'MAPE %', key: 'mape', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    data.productos.forEach((prod) => {
      worksheet.addRow({
        codigo: prod.codigo,
        nombre: prod.nombre,
        categoria: prod.categoria,
        ventas_30d: prod.ventas_30d,
        pronostico_30d: prod.pronostico_30d,
        limite_inferior: prod.limite_inferior,
        limite_superior: prod.limite_superior,
        mape: prod.mape !== null ? prod.mape : ''
      });
    });

    ['ventas_30d', 'pronostico_30d', 'limite_inferior', 'limite_superior'].forEach(col => {
      worksheet.getColumn(col).numFmt = '#,##0';
    });
    worksheet.getColumn('mape').numFmt = '0.0';

    return workbook.xlsx.writeBuffer() as any;
  }

  async generateStockMovementsPDF(data: StockMovementsReportData): Promise<Buffer> {
    const doc = new PDFKit({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(16).font('Helvetica-Bold').text('Movimientos de Stock', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    if (data.desde && data.hasta) {
      doc.text(`Periodo: ${data.desde} al ${data.hasta}`, { align: 'left' });
    } else if (data.desde) {
      doc.text(`Desde: ${data.desde}`, { align: 'left' });
    } else {
      doc.text('Periodo: últimos 30 días', { align: 'left' });
    }
    doc.text(`Generado: ${new Date(data.generatedAt).toLocaleString('es-PE')}`, { align: 'left' });
    doc.moveDown(1);

    const tableTop = doc.y;
    const colWidths = [70, 55, 120, 40, 55, 45, 45, 55];
    const headers = ['Fecha', 'Tipo', 'Producto', 'Cant.', 'P. Unit.', 'Stock Ant.', 'Stock Nuevo', 'Usuario'];

    doc.fillColor('#1e3a8a').rect(50, tableTop, 485, 20).fill();
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');

    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: i >= 3 ? 'right' : 'left' });
      xPos += colWidths[i];
    });

    doc.fillColor('black').font('Helvetica').fontSize(7);
    let yPos = tableTop + 25;

    data.movimientos.forEach((mov, index) => {
      if (index % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, yPos - 3, 485, 15).fill();
      } else {
        doc.fillColor('white').rect(50, yPos - 3, 485, 15).fill();
      }
      doc.fillColor('black');

      const fechaStr = new Date(mov.fecha).toLocaleDateString('es-PE');
      const tipoStr = mov.tipo_movimiento.toUpperCase();
      const ref = mov.referencia_id ? `#${mov.referencia_id}` : '-';

      xPos = 55;
      doc.text(fechaStr, xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];
      doc.text(`${tipoStr} ${ref}`, xPos, yPos, { width: colWidths[1], ellipsis: true });
      xPos += colWidths[1];
      doc.text(mov.producto, xPos, yPos, { width: colWidths[2], ellipsis: true });
      xPos += colWidths[2];
      doc.text(String(mov.cantidad), xPos, yPos, { width: colWidths[3], align: 'right' });
      xPos += colWidths[3];
      doc.text(`S/ ${mov.precio_unitario.toFixed(2)}`, xPos, yPos, { width: colWidths[4], align: 'right' });
      xPos += colWidths[4];
      doc.text(String(mov.stock_anterior), xPos, yPos, { width: colWidths[5], align: 'right' });
      xPos += colWidths[5];
      doc.text(String(mov.stock_nuevo), xPos, yPos, { width: colWidths[6], align: 'right' });
      xPos += colWidths[6];
      doc.text(mov.usuario, xPos, yPos, { width: colWidths[7], ellipsis: true });

      yPos += 15;
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    yPos += 5;
    doc.fillColor('#dbeafe').rect(50, yPos - 3, 485, 18).fill();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
    doc.text('RESUMEN', 55, yPos, { width: 100 });
    doc.text(`Entradas: ${data.totalEntradas}`, 250, yPos, { width: 110, align: 'right' });
    doc.text(`Salidas: ${data.totalSalidas}`, 370, yPos, { width: 110, align: 'right' });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  async generateStockMovementsExcel(data: StockMovementsReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CREDISA Inventory System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Movimientos de Stock');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 16 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Ref', key: 'referencia', width: 10 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Producto', key: 'producto', width: 35 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Precio Unit.', key: 'precio_unitario', width: 14 },
      { header: 'Stock Ant.', key: 'stock_anterior', width: 12 },
      { header: 'Stock Nuevo', key: 'stock_nuevo', width: 12 },
      { header: 'Usuario', key: 'usuario', width: 20 },
      { header: 'Motivo', key: 'motivo', width: 25 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    data.movimientos.forEach((mov) => {
      worksheet.addRow({
        fecha: new Date(mov.fecha).toLocaleDateString('es-PE'),
        tipo: mov.tipo_movimiento,
        referencia: mov.referencia_id || '',
        codigo: mov.codigo,
        producto: mov.producto,
        cantidad: mov.cantidad,
        precio_unitario: mov.precio_unitario,
        stock_anterior: mov.stock_anterior,
        stock_nuevo: mov.stock_nuevo,
        usuario: mov.usuario,
        motivo: mov.motivo || ''
      });
    });

    ['cantidad', 'precio_unitario', 'stock_anterior', 'stock_nuevo'].forEach(col => {
      worksheet.getColumn(col).numFmt = '#,##0.00';
    });

    return workbook.xlsx.writeBuffer() as any;
  }

  async generateFinancialKpisPDF(data: FinancialKpisReportData): Promise<Buffer> {
    const doc = new PDFKit({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(16).font('Helvetica-Bold').text('KPIs Financieros', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Generado: ${new Date(data.generatedAt).toLocaleString('es-PE')}`, { align: 'left' });
    doc.moveDown(0.5);

    // KPIs
    doc.fontSize(12).font('Helvetica-Bold').text('Indicadores de Inventario');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);

    let yPos = doc.y;
    data.kpis.forEach((kpi, index) => {
      if (index % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, yPos - 3, 485, 20).fill();
      } else {
        doc.fillColor('white').rect(50, yPos - 3, 485, 20).fill();
      }
      doc.fillColor('black');
      doc.text(kpi.descripcion, 55, yPos, { width: 320 });
      doc.font('Helvetica-Bold').text(kpi.valor, 390, yPos, { width: 130, align: 'right' });
      doc.font('Helvetica');
      yPos += 20;
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    doc.moveDown(1);

    // Proyecciones
    doc.fontSize(12).font('Helvetica-Bold').text('Proyecciones Financieras (6 meses)');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8);

    const tableTop = doc.y;
    const colWidths = [80, 120, 120, 120];
    const headers = ['Mes', 'Ingresos', 'Gastos', 'Ganancia'];

    doc.fillColor('#1e3a8a').rect(50, tableTop, 440, 20).fill();
    doc.fillColor('white').font('Helvetica-Bold');

    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: 'right' });
      xPos += colWidths[i];
    });

    doc.fillColor('black').font('Helvetica');
    yPos = tableTop + 25;

    data.proyecciones.forEach((proj, index) => {
      if (index % 2 === 0) {
        doc.fillColor('#f9fafb').rect(50, yPos - 3, 440, 16).fill();
      } else {
        doc.fillColor('white').rect(50, yPos - 3, 440, 16).fill();
      }
      doc.fillColor('black');
      xPos = 55;
      doc.text(proj.date, xPos, yPos, { width: colWidths[0], align: 'right' });
      xPos += colWidths[0];
      doc.text(`S/ ${proj.projectedRevenue.toFixed(2)}`, xPos, yPos, { width: colWidths[1], align: 'right' });
      xPos += colWidths[1];
      doc.text(`S/ ${proj.projectedExpenses.toFixed(2)}`, xPos, yPos, { width: colWidths[2], align: 'right' });
      xPos += colWidths[2];
      doc.text(`S/ ${proj.projectedProfit.toFixed(2)}`, xPos, yPos, { width: colWidths[3], align: 'right' });
      yPos += 16;
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  async generateFinancialKpisExcel(data: FinancialKpisReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CREDISA Inventory System';
    workbook.created = new Date();

    const kpiSheet = workbook.addWorksheet('KPIs');
    kpiSheet.columns = [
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Valor', key: 'valor', width: 25 }
    ];
    kpiSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    kpiSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } };
    data.kpis.forEach(kpi => kpiSheet.addRow({ descripcion: kpi.descripcion, valor: kpi.valor }));

    const projSheet = workbook.addWorksheet('Proyecciones');
    projSheet.columns = [
      { header: 'Mes', key: 'date', width: 15 },
      { header: 'Ingresos (S/)', key: 'revenue', width: 18 },
      { header: 'Gastos (S/)', key: 'expenses', width: 18 },
      { header: 'Ganancia (S/)', key: 'profit', width: 18 }
    ];
    projSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    projSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e3a8a' } };
    data.proyecciones.forEach(p => projSheet.addRow({
      date: p.date,
      revenue: p.projectedRevenue,
      expenses: p.projectedExpenses,
      profit: p.projectedProfit
    }));
    ['revenue', 'expenses', 'profit'].forEach(col => projSheet.getColumn(col).numFmt = '#,##0.00');

    return workbook.xlsx.writeBuffer() as any;
  }
}
