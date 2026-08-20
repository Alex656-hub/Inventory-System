// backend/src/services/ReportService.ts
import PDFKit from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { ReportParams, InventoryReportData } from '../types/reports';

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
}
