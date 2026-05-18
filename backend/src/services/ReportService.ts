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
    entrada_valor_total: number;
    salida_cantidad: number;
    salida_costo_unitario: number;
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

    // Encabezados de tabla
    const tableTop = doc.y;
    const colWidths = [60, 70, 45, 80, 80, 50, 65];
    const headers = ['Fecha', 'Tipo', 'Mov. ID', 'Sede Origen', 'Destino', 'Cant.', 'Costo U.'];
    
    // Dibujar cabecera
    doc.fillColor('#1e3a8a').rect(50, tableTop, 515, 20).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    
    let xPos = 55;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 5, { width: colWidths[i], align: i >= 5 ? 'right' : 'left' });
      xPos += colWidths[i];
    });

    // Filas de datos
    doc.fillColor('black').font('Helvetica').fontSize(8);
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
      doc.text(mov.entrada_cantidad > 0 || mov.salida_cantidad > 0 
        ? String(mov.entrada_cantidad > 0 ? mov.entrada_cantidad : mov.salida_cantidad) 
        : '-', xPos, yPos, { width: colWidths[5], align: 'right' });
      xPos += colWidths[5];
      doc.text(`S/ ${Number(mov.entrada_cantidad > 0 ? mov.entrada_costo_unitario : mov.salida_costo_unitario).toFixed(2)}`, xPos, yPos, { width: colWidths[6], align: 'right' });

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
    doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
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
      { header: 'Valor Total', key: 'valor_total', width: 15 }
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
        valor_total: producto.valor_total
      });
    });

    // Formato de números
    worksheet.getColumn('stock_actual').numFmt = '#,##0';
    worksheet.getColumn('costo_unitario').numFmt = '#,##0.00';
    worksheet.getColumn('valor_total').numFmt = '#,##0.00';

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
}
