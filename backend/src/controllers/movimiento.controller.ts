import { Request, Response } from 'express';
import { Op } from 'sequelize';
import MovimientoInventario from '../models/MovimientoInventario';
import OperacionStock from '../models/OperacionStock';
import Product from '../models/Product';
import User from '../models/User';
import Personal from '../models/Personal';
import Sede from '../models/Sede';

export const obtenerMovimientos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      pagina = 1, 
      limite = 50, 
      producto_id, 
      tipo_movimiento,
      fecha_desde,
      fecha_hasta 
    } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (producto_id) {
      where.producto_id = producto_id;
    }

    if (tipo_movimiento) {
      where.tipo_movimiento = tipo_movimiento;
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
    }

    const { count, rows } = await MovimientoInventario.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      limit: Number(limite),
      offset,
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      movimientos: rows,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ mensaje: 'Error al obtener movimientos' });
  }
};

export const obtenerKardexPorProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: productoId } = req.params;
    const { metodo = 'promedio' } = req.query; // 'promedio', 'peps', 'ueps'

    const producto = await Product.findByPk(productoId, {
      include: [
        { model: require('../models/Category').default, as: 'categoria' },
        { model: require('../models/Supplier').default, as: 'proveedor' }
      ]
    });

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    const movimientos = await MovimientoInventario.findAll({
      where: { producto_id: productoId },
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      order: [['fecha', 'ASC'], ['id', 'ASC']]
    });

    // Calcular kardex según método
    let stockAcumulado = 0;
    let costoAcumulado = 0;

    const kardex = movimientos.map((mov) => {
      let costoUnitario = 0;
      let saldoCantidad = 0;
      let saldoValor = 0;

      if (mov.tipo_movimiento === 'entrada') {
        stockAcumulado += mov.cantidad;
        
        if (metodo === 'promedio') {
          costoAcumulado += mov.cantidad * Number(mov.precio_unitario);
          costoUnitario = stockAcumulado > 0 ? costoAcumulado / stockAcumulado : Number(mov.precio_unitario);
        } else {
          costoUnitario = Number(mov.precio_unitario);
          costoAcumulado += mov.cantidad * costoUnitario;
        }
        
        saldoCantidad = stockAcumulado;
        saldoValor = stockAcumulado * costoUnitario;
      } else if (mov.tipo_movimiento === 'salida') {
        if (metodo === 'promedio') {
          costoUnitario = stockAcumulado > 0 ? costoAcumulado / stockAcumulado : Number(mov.precio_unitario);
        } else if (metodo === 'peps') {
          // PEPS: tomar el costo más antiguo pendiente
          // Simplificado: usar precio unitario del movimiento
          costoUnitario = Number(mov.precio_unitario);
        } else if (metodo === 'ueps') {
          // UEPS: tomar el costo más reciente
          costoUnitario = Number(mov.precio_unitario);
        }
        
        stockAcumulado -= mov.cantidad;
        costoAcumulado -= mov.cantidad * costoUnitario;
        saldoCantidad = stockAcumulado;
        saldoValor = stockAcumulado * costoUnitario;
      } else {
        // Ajuste
        stockAcumulado = mov.stock_nuevo;
        if (metodo === 'promedio') {
          costoUnitario = stockAcumulado > 0 ? costoAcumulado / stockAcumulado : Number(mov.precio_unitario);
        } else {
          costoUnitario = Number(mov.precio_unitario);
        }
        saldoCantidad = stockAcumulado;
        saldoValor = stockAcumulado * costoUnitario;
      }

      return {
        id: mov.id,
        fecha: mov.fecha,
        tipo_movimiento: mov.tipo_movimiento,
        referencia: mov.tipo_referencia,
        documento: mov.motivo,
        entrada_cantidad: mov.tipo_movimiento === 'entrada' ? mov.cantidad : 0,
        entrada_costo_unitario: mov.tipo_movimiento === 'entrada' ? Number(mov.precio_unitario) : 0,
        entrada_valor_total: mov.tipo_movimiento === 'entrada' ? mov.cantidad * Number(mov.precio_unitario) : 0,
        salida_cantidad: mov.tipo_movimiento === 'salida' ? mov.cantidad : 0,
        salida_costo_unitario: mov.tipo_movimiento === 'salida' ? costoUnitario : 0,
        salida_valor_total: mov.tipo_movimiento === 'salida' ? mov.cantidad * costoUnitario : 0,
        saldo_cantidad: saldoCantidad,
        saldo_costo_unitario: costoUnitario,
        saldo_valor_total: saldoValor,
        usuario: mov.usuario?.nombre,
        observaciones: mov.observaciones
      };
    });

    res.json({
      producto: {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria?.nombre,
        proveedor: producto.proveedor?.nombre
      },
      metodo: metodo,
      kardex,
      resumen: {
        stock_actual: stockAcumulado,
        valor_inventario: kardex.length > 0 ? kardex[kardex.length - 1].saldo_valor_total : 0
      }
    });
  } catch (error) {
    console.error('Error al obtener kardex:', error);
    res.status(500).json({ mensaje: 'Error al obtener kardex' });
  }
};

export const obtenerHistorialMovimientos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      pagina = 1, 
      limite = 20, 
      producto_id, 
      tipo_movimiento,
      fecha_desde,
      fecha_hasta,
      sede_id 
    } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (producto_id) {
      where.producto_id = producto_id;
    }

    if (tipo_movimiento) {
      where.tipo_movimiento = tipo_movimiento;
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
    }

    if (sede_id) {
      const sedeIdNum = Number(sede_id);
      const ops = await OperacionStock.findAll({
        where: {
          [Op.or]: [
            { sede_origen_id: sedeIdNum },
            { sede_destino_id: sedeIdNum }
          ]
        },
        attributes: ['id']
      });
      const opIds = ops.map(o => o.id);
      if (opIds.length > 0) {
        where.referencia_id = { [Op.in]: opIds };
      } else {
        res.json({ movimientos: [], paginacion: { total: 0, pagina: Number(pagina), limite: Number(limite), totalPaginas: 0 } });
        return;
      }
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
      if (fecha_hasta) {
        const hasta = new Date(fecha_hasta as string);
        hasta.setDate(hasta.getDate() + 1);
        where.fecha[Op.lt] = hasta;
      }
    }

    const { count, rows } = await MovimientoInventario.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      limit: Number(limite),
      offset,
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });

    // Obtener operaciones de stock relacionadas para los IDs de movimiento
    const movimientoIds = rows.map(m => m.referencia_id).filter(id => id);

    const operacionesRelacionadas = await OperacionStock.findAll({
      where: { 
        id: { [Op.in]: movimientoIds as number[] },
        estado: 'PROCESADO'
      },
      attributes: ['id', 'tipo_operacion', 'sede_origen_id', 'sede_destino_id'],
      include: [
        { model: Sede, as: 'sede_origen', attributes: ['nombre'] },
        { model: Sede, as: 'sede_destino', attributes: ['nombre'] },
        { model: Personal, as: 'personal', attributes: ['nombreCompleto'] }
      ]
    });

    const operacionesMap = new Map(operacionesRelacionadas.map(op => [
      op.id, 
      { 
        tipo: op.tipo_operacion, 
        sede_origen: op.sede_origen?.nombre,
        sede_destino: op.sede_destino?.nombre,
        personal: op.personal?.nombreCompleto
      }
    ]));

    const movimientosConSedes = rows.map(mov => {
      const operacion = mov.referencia_id ? operacionesMap.get(mov.referencia_id) : null;
      return {
        id: mov.id,
        fecha: mov.fecha,
        tipo_movimiento: mov.tipo_movimiento,
        referencia_id: mov.referencia_id,
        tipo_referencia: mov.tipo_referencia,
        cantidad: mov.cantidad,
        precio_unitario: mov.precio_unitario,
        stock_anterior: mov.stock_anterior,
        stock_nuevo: mov.stock_nuevo,
        motivo: mov.motivo,
        observaciones: mov.observaciones,
        usuario: mov.usuario?.nombre,
        producto: mov.producto ? {
          id: mov.producto.id,
          codigo: mov.producto.codigo,
          nombre: mov.producto.nombre
        } : null,
        // Datos de la operación de stock relacionada (o del movimiento directamente)
        operacion_tipo: operacion?.tipo || null,
        sede_origen: operacion?.sede_origen || mov.sede_origen || null,
        sede_destino: operacion?.sede_destino || mov.sede_destino || null,
        responsable: operacion?.personal || mov.responsable || null,
        // Flag para indicar si tiene PDF guardado
        tiene_pdf: mov.referencia_id && operacionesMap.has(mov.referencia_id)
      };
    });

    res.json({
      movimientos: movimientosConSedes,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener historial de movimientos:', error);
    res.status(500).json({ mensaje: 'Error al obtener historial de movimientos' });
  }
};

export const obtenerPreviewOperacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Buscar la operación por referencia_id en movimientos o directamente en operaciones_stock
    let operacion = null;
    
    // Primero buscar directamente en operaciones_stock
    operacion = await OperacionStock.findByPk(id, {
      include: [
        { model: require('../models/DetalleOperacion').default, as: 'detalles', include: [{ model: Product, as: 'producto' }] },
        { model: Personal, as: 'personal', attributes: ['nombreCompleto'] },
        { model: Sede, as: 'sede_origen', attributes: ['nombre'] },
        { model: Sede, as: 'sede_destino', attributes: ['nombre'] },
        { model: require('../models/Supplier').default, as: 'proveedor', attributes: ['nombre'] }
      ]
    });

    if (!operacion) {
      // Buscar como referencia_id en movimientos
      const movimiento = await MovimientoInventario.findByPk(id, {
        include: [{ model: Product, as: 'producto' }]
      });

      if (movimiento?.referencia_id) {
        operacion = await OperacionStock.findByPk(movimiento.referencia_id, {
          include: [
            { model: require('../models/DetalleOperacion').default, as: 'detalles', include: [{ model: Product, as: 'producto' }] },
            { model: Personal, as: 'personal', attributes: ['nombreCompleto'] },
            { model: Sede, as: 'sede_origen', attributes: ['nombre'] },
            { model: Sede, as: 'sede_destino', attributes: ['nombre'] },
            { model: require('../models/Supplier').default, as: 'proveedor', attributes: ['nombre'] }
          ]
        });
      }
    }

    if (!operacion) {
      res.status(404).json({ mensaje: 'Operación no encontrada' });
      return;
    }

    // Si tiene PDF guardado, retornarlo
    if (operacion.pdf_html) {
      res.json({
        html: operacion.pdf_html,
        operacion_id: operacion.id
      });
      return;
    }

    // Si no tiene PDF guardado, generar uno
    const pdfHtml = generarPdfHtmlPreview(operacion);
    
    res.json({
      html: pdfHtml,
      operacion_id: operacion.id
    });
  } catch (error) {
    console.error('Error al obtener preview:', error);
    res.status(500).json({ mensaje: 'Error al obtener preview' });
  }
};

export const obtenerPdfOperacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let operacion = await OperacionStock.findByPk(id);

    if (!operacion) {
      // Buscar como referencia_id en movimientos
      const movimiento = await MovimientoInventario.findByPk(id);
      if (movimiento?.referencia_id) {
        operacion = await OperacionStock.findByPk(movimiento.referencia_id);
      }
    }

    if (!operacion) {
      res.status(404).json({ mensaje: 'Operación no encontrada' });
      return;
    }

    if (!operacion.pdf_html) {
      res.status(400).json({ mensaje: 'La operación no tiene PDF generado' });
      return;
    }

    // Configurar headers para HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="operacion_${operacion.id}.html"`);
    res.send(operacion.pdf_html);
  } catch (error) {
    console.error('Error al obtener PDF:', error);
    res.status(500).json({ mensaje: 'Error al obtener PDF' });
  }
};

// Función helper para generar HTML del PDF (similar a la del controller de operacionStock)
function generarPdfHtmlPreview(operacion: any): string {
  const tipoLabelMap: Record<string, string> = {
    'ENTRADA': 'ENTRADA (COMPRA)',
    'SALIDA': 'SALIDA (VENTA)',
    'TRASPASO': 'TRASPASO'
  };
  const tipoOperacionLabel = tipoLabelMap[operacion.tipo_operacion] || 'OPERACIÓN';

  const sedeNombre = operacion.tipo_operacion === 'ENTRADA' || operacion.tipo_operacion === 'TRASPASO'
    ? operacion.sede_destino?.nombre
    : operacion.sede_origen?.nombre;

    let tercerosLabel = '';
    let tercerosNombre = '';
    if (operacion.tipo_operacion === 'ENTRADA') {
      tercerosLabel = 'Proveedor';
      tercerosNombre = operacion.proveedor?.nombre || '-';
    } else if (operacion.tipo_operacion === 'SALIDA') {
      tercerosLabel = 'Cliente';
      tercerosNombre = '-';
    }

    const responsableNombre = operacion.personal?.nombreCompleto || '-';
  const fechaEmision = operacion.fecha_emision 
    ? new Date(operacion.fecha_emision).toLocaleDateString('es-PE')
    : new Date().toLocaleDateString('es-PE');
  const fechaProcesamiento = new Date().toLocaleString('es-PE');

  const detallesHtml = (operacion.detalles || []).map((d: any) => {
    const costo = Number(d.costo_unitario) || 0;
    const sub = Number(d.subtotal) || 0;
    return `
    <tr>
      <td>${d.producto?.codigo || ''}</td>
      <td>${d.producto?.nombre || ''}</td>
      <td style="text-align:center">S/ ${costo.toFixed(2)}</td>
      <td style="text-align:center">${d.cantidad}</td>
      <td style="text-align:center">S/ ${sub.toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Operación de Stock #${operacion.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        h1 { font-size: 24px; margin: 0; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .operacion-id { font-size: 14px; color: #666; }
        .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-weight: bold; color: #555; font-size: 12px; }
        .info-value { font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 10px; font-size: 13px; }
        th { background: #f5f5f5; }
        .totales { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Operación de Stock</h1>
          <div class="operacion-id">ID: #${operacion.id}</div>
        </div>
        <div class="success-badge">✓ PROCESADO</div>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">TIPO DE OPERACIÓN</div>
          <div class="info-value">${tipoOperacionLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">FECHA DE EMISIÓN</div>
          <div class="info-value">${fechaEmision}</div>
        </div>
        <div class="info-item">
          <div class="info-label">FECHA DE PROCESAMIENTO</div>
          <div class="info-value">${fechaProcesamiento}</div>
        </div>
        <div class="info-item">
          <div class="info-label">RESPONSABLE FÍSICO</div>
          <div class="info-value">${responsableNombre}</div>
        </div>
        <div class="info-item">
          <div class="info-label">${operacion.tipo_operacion === 'ENTRADA' || operacion.tipo_operacion === 'TRASPASO' ? 'SEDE DESTINO' : 'SEDE ORIGEN'}</div>
          <div class="info-value">${sedeNombre || '-'}</div>
        </div>
        ${tercerosLabel ? `
        <div class="info-item">
          <div class="info-label">${tercerosLabel.toUpperCase()}</div>
          <div class="info-value">${tercerosNombre}</div>
        </div>
        ` : ''}
        ${operacion.tipo_operacion === 'TRASPASO' ? `
        <div class="info-item">
          <div class="info-label">SEDE DESTINO</div>
          <div class="info-value">${operacion.sede_destino?.nombre || '-'}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">REFERENCIA</div>
          <div class="info-value">${operacion.referencia || '-'}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th style="text-align:center">Costo Unit.</th>
            <th style="text-align:center">Cantidad</th>
            <th style="text-align:center">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${detallesHtml}
        </tbody>
      </table>
      <div class="totales">
        TOTAL UNIDADES: ${operacion.total_unidades} | TOTAL: S/ ${Number(operacion.costo_total).toFixed(2)}
      </div>
      <div class="footer">
        Documento generado automáticamente por el Sistema de Inventario CREDISA
      </div>
    </body>
    </html>
  `;

  return html;
}

