import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import OperacionStock from '../models/OperacionStock';
import DetalleOperacion from '../models/DetalleOperacion';
import StockPorSede from '../models/StockPorSede';
import Product from '../models/Product';
import MovimientoInventario from '../models/MovimientoInventario';
import Personal from '../models/Personal';
import Sede from '../models/Sede';
import Supplier from '../models/Supplier';
import { sequelize } from '../config/database';
import { Transaction } from 'sequelize';
import { alertService } from '../services/alertService';

interface OperacionRequest {
  tipo_operacion: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  fecha_emision: Date;
  personal_id: number;
  referencia?: string;
  sede_origen_id?: number;
  sede_destino_id?: number;
  proveedor_id?: number;
  cliente_id?: number;
  motivo_traspaso?: string;
  detalles: Array<{
    producto_id: number;
    cantidad: number;
    costo_unitario: number;
    lote?: string;
    fecha_vencimiento?: Date;
  }>;
}

class OperacionStockController {
  constructor() {
    this.crearOperacion = this.crearOperacion.bind(this);
    this.procesarOperacion = this.procesarOperacion.bind(this);
    this.obtenerStockDisponible = this.obtenerStockDisponible.bind(this);
    this.listarOperaciones = this.listarOperaciones.bind(this);
  }

  // Crear nueva operación
  async crearOperacion(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const operacionData: OperacionRequest = req.body;
      
      if (!operacionData.personal_id) {
        return res.status(400).json({ message: 'El responsable físico es requerido' });
      }

      // Validar campos según tipo de operación
      const validacion = this.validarCamposPorTipo(operacionData);
      if (!validacion.valido) {
        return res.status(400).json({ message: validacion.mensaje });
      }

      // Validar stock disponible para SALIDA y TRASPASO
      if (operacionData.tipo_operacion === 'SALIDA' || operacionData.tipo_operacion === 'TRASPASO') {
        const validacionStock = await this.validarStockDisponible(operacionData);
        if (!validacionStock.valido) {
          return res.status(400).json({ message: validacionStock.mensaje });
        }
      }

      // Calcular totales
      const { total_unidades, costo_total } = this.calcularTotales(operacionData.detalles);

      const result = await sequelize.transaction(async (t: Transaction) => {
        // Crear operación principal (solo campos del modelo, sin detalles)
        const operacion = await OperacionStock.create({
          tipo_operacion: operacionData.tipo_operacion,
          fecha_emision: operacionData.fecha_emision,
          personal_id: operacionData.personal_id,
          referencia: operacionData.referencia,
          sede_origen_id: operacionData.sede_origen_id,
          sede_destino_id: operacionData.sede_destino_id,
          proveedor_id: operacionData.proveedor_id,
          cliente_id: operacionData.cliente_id,
          motivo_traspaso: operacionData.motivo_traspaso,
          total_unidades,
          costo_total,
          estado: 'BORRADOR'
        }, { transaction: t });

        // Crear detalles y calcular subtotales (solo campos del modelo)
        const detallesConSubtotal = operacionData.detalles.map(detalle => ({
          operacion_id: operacion.id,
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          costo_unitario: detalle.costo_unitario,
          lote: detalle.lote,
          fecha_vencimiento: detalle.fecha_vencimiento,
          subtotal: detalle.cantidad * detalle.costo_unitario
        }));

        await DetalleOperacion.bulkCreate(detallesConSubtotal, { transaction: t });

        return operacion;
      });

      res.status(201).json({
        message: 'Operación creada exitosamente',
        operacion: result
      });
    } catch (error) {
      console.error('Error al crear operación:', error);
      if (error instanceof Error) {
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
      }
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Procesar operación (actualizar stock)
  async procesarOperacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const operacion = await OperacionStock.findByPk(id, {
        include: [
          { model: DetalleOperacion, as: 'detalles', include: [{ model: Product, as: 'producto' }] }
        ]
      }) as OperacionStock & { detalles: (DetalleOperacion & { producto?: Product })[] };

      if (!operacion) {
        return res.status(404).json({ message: 'Operación no encontrada' });
      }

      if (operacion.estado !== 'BORRADOR') {
        return res.status(400).json({ message: 'La operación ya fue procesada o cancelada' });
      }

      await sequelize.transaction(async (t: Transaction) => {
        for (const detalle of operacion.detalles!) {
          await this.procesarDetalleOperacion(operacion, detalle, t);
        }
        await operacion.update({ estado: 'PROCESADO' }, { transaction: t });
      });

      // Generar PDF después de la transacción
      try {
        const operacionCompleta = await OperacionStock.findByPk(id, {
          include: [
            { model: DetalleOperacion, as: 'detalles', include: [{ model: Product, as: 'producto' }] },
            { model: Personal, as: 'personal', attributes: ['nombreCompleto'] },
            { model: Sede, as: 'sede_origen', attributes: ['nombre'] },
            { model: Sede, as: 'sede_destino', attributes: ['nombre'] },
            { model: Supplier, as: 'proveedor', attributes: ['nombre'] }
          ]
        });
        if (operacionCompleta) {
          const pdfHtml = this.generarPdfHtml(operacionCompleta);
          await OperacionStock.update({ pdf_html: pdfHtml }, { where: { id } });
        }
      } catch (pdfError) {
        console.error('Error al generar PDF (no crítico):', pdfError);
      }

      res.json({
        message: 'Operación procesada exitosamente',
        operacion
      });

      alertService.checkLowStock().catch(err => {
        console.warn('Background alert check failed:', err.message);
      });
    } catch (error) {
      console.error('Error al procesar operación:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Obtener stock disponible de un producto en una sede
  async obtenerStockDisponible(req: Request, res: Response) {
    try {
      const { productoId, sedeId } = req.params;

      const stocks = await StockPorSede.findAll({
        where: {
          producto_id: productoId,
          sede_id: sedeId
        },
        include: [
          { model: Product, as: 'producto' }
        ]
      });

      if (stocks.length === 0) {
        return res.json({
          producto_id: parseInt(productoId),
          sede_id: parseInt(sedeId),
          cantidad_actual: 0,
          stock_minimo: 0,
          disponible: true
        });
      }

      const cantidadTotal = stocks.reduce((sum, s) => sum + s.cantidad_actual, 0);
      const stockMinimo = Math.min(...stocks.map(s => s.stock_minimo));

      res.json({
        ...stocks[0].toJSON(),
        cantidad_actual: cantidadTotal,
        stock_minimo: stockMinimo,
        disponible: cantidadTotal > 0
      });
    } catch (error) {
      console.error('Error al obtener stock disponible:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Listar operaciones
  async listarOperaciones(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, tipo, estado } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (tipo) where.tipo_operacion = tipo;
      if (estado) where.estado = estado;

      const { rows: operaciones, count } = await OperacionStock.findAndCountAll({
        where,
        include: [
          { model: Personal, as: 'personal', attributes: ['id', 'nombreCompleto'] },
          { model: Sede, as: 'sede_origen', attributes: ['id', 'nombre'] },
          { model: Sede, as: 'sede_destino', attributes: ['id', 'nombre'] },
          { model: Supplier, as: 'proveedor', attributes: ['id', 'nombre'] }
        ],
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        operaciones,
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit))
      });
    } catch (error) {
      console.error('Error al listar operaciones:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Métodos privados
  private validarCamposPorTipo(data: OperacionRequest): { valido: boolean; mensaje: string } {
    switch (data.tipo_operacion) {
      case 'ENTRADA':
        if (!data.sede_destino_id) {
          return { valido: false, mensaje: 'La sede destino es requerida para entradas' };
        }
        if (!data.proveedor_id) {
          return { valido: false, mensaje: 'El proveedor es requerido para entradas' };
        }
        break;
      case 'SALIDA':
        if (!data.sede_origen_id) {
          return { valido: false, mensaje: 'La sede origen es requerida para salidas' };
        }
        break;
      case 'TRASPASO':
        if (!data.sede_origen_id || !data.sede_destino_id) {
          return { valido: false, mensaje: 'Ambas sedes (origen y destino) son requeridas para traspasos' };
        }
        if (data.sede_origen_id === data.sede_destino_id) {
          return { valido: false, mensaje: 'Las sedes de origen y destino deben ser diferentes' };
        }
        break;
    }
    return { valido: true, mensaje: '' };
  }

  private async validarStockDisponible(data: OperacionRequest): Promise<{ valido: boolean; mensaje: string }> {
    const sedeId = data.tipo_operacion === 'SALIDA' ? data.sede_origen_id! : data.sede_origen_id!;
    
    for (const detalle of data.detalles) {
      const stock = await StockPorSede.findOne({
        where: {
          producto_id: detalle.producto_id,
          sede_id: sedeId
        }
      });

      if (!stock || stock.cantidad_actual < detalle.cantidad) {
        const producto = await Product.findByPk(detalle.producto_id);
        return {
          valido: false,
          mensaje: `Stock insuficiente para el producto ${producto?.nombre}. Disponible: ${stock?.cantidad_actual || 0}, Solicitado: ${detalle.cantidad}`
        };
      }
    }
    return { valido: true, mensaje: '' };
  }

  private calcularTotales(detalles: OperacionRequest['detalles']) {
    const total_unidades = detalles.reduce((sum, detalle) => sum + detalle.cantidad, 0);
    const costo_total = detalles.reduce((sum, detalle) => sum + (detalle.cantidad * detalle.costo_unitario), 0);
    return { total_unidades, costo_total };
  }

  private async procesarDetalleOperacion(operacion: OperacionStock, detalle: DetalleOperacion, transaction: Transaction) {
    const { producto_id, cantidad, costo_unitario } = detalle;

    switch (operacion.tipo_operacion) {
      case 'ENTRADA':
        await this.procesarEntrada(operacion.id, producto_id, operacion.sede_destino_id!, cantidad, costo_unitario, transaction);
        break;
      case 'SALIDA':
        await this.procesarSalida(operacion.id, producto_id, operacion.sede_origen_id!, cantidad, costo_unitario, transaction);
        break;
      case 'TRASPASO':
        await this.procesarTraspaso(operacion.id, producto_id, operacion.sede_origen_id!, operacion.sede_destino_id!, cantidad, costo_unitario, transaction);
        break;
    }
  }

  private async procesarEntrada(operacionId: number, productoId: number, sedeId: number, cantidad: number, costoUnitario: number, transaction: Transaction) {
    // Actualizar o crear stock por sede
    const [stock, created] = await StockPorSede.findOrCreate({
      where: { producto_id: productoId, sede_id: sedeId },
      defaults: {
        producto_id: productoId,
        sede_id: sedeId,
        cantidad_actual: cantidad,
        stock_minimo: 0,
        ultimo_movimiento: new Date()
      },
      transaction
    });

    if (!created) {
      await stock.update({
        cantidad_actual: stock.cantidad_actual + cantidad,
        ultimo_movimiento: new Date()
      }, { transaction });
    }

    // Crear movimiento histórico con referencia a la operación
    await MovimientoInventario.create({
      producto_id: productoId,
      tipo_movimiento: 'entrada',
      referencia_id: operacionId,
      tipo_referencia: 'operacion_stock',
      cantidad: cantidad,
      precio_unitario: costoUnitario,
      stock_anterior: created ? 0 : stock.cantidad_actual - cantidad,
      stock_nuevo: stock.cantidad_actual,
      usuario_id: 1, // TODO: Obtener del token
      fecha: new Date(),
      motivo: 'Entrada de inventario'
    }, { transaction });
  }

  private async procesarSalida(operacionId: number, productoId: number, sedeId: number, cantidad: number, costoUnitario: number, transaction: Transaction) {
    const stocks = await StockPorSede.findAll({
      where: { producto_id: productoId, sede_id: sedeId },
      order: [['almacen_id', 'ASC NULLS FIRST']],
      transaction
    });

    const totalDisponible = stocks.reduce((sum, s) => sum + s.cantidad_actual, 0);
    if (totalDisponible < cantidad) {
      throw new Error('Stock insuficiente para la salida');
    }

    let restante = cantidad;
    for (const s of stocks) {
      if (restante <= 0) break;
      const aDescontar = Math.min(s.cantidad_actual, restante);
      await s.update({
        cantidad_actual: s.cantidad_actual - aDescontar,
        ultimo_movimiento: new Date()
      }, { transaction });
      restante -= aDescontar;
    }

    const stockFinal = totalDisponible - cantidad;

    // Crear movimiento histórico con referencia a la operación
    await MovimientoInventario.create({
      producto_id: productoId,
      tipo_movimiento: 'salida',
      referencia_id: operacionId,
      tipo_referencia: 'operacion_stock',
      cantidad: cantidad,
      precio_unitario: costoUnitario,
      stock_anterior: totalDisponible,
      stock_nuevo: stockFinal,
      usuario_id: 1, // TODO: Obtener del token
      fecha: new Date(),
      motivo: 'Salida de inventario'
    }, { transaction });
  }

  private async procesarTraspaso(operacionId: number, productoId: number, sedeOrigenId: number, sedeDestinoId: number, cantidad: number, costoUnitario: number, transaction: Transaction) {
    // Procesar salida del origen
    await this.procesarSalida(operacionId, productoId, sedeOrigenId, cantidad, costoUnitario, transaction);
    
    // Procesar entrada en destino
    await this.procesarEntrada(operacionId, productoId, sedeDestinoId, cantidad, costoUnitario, transaction);
  }

  private generarPdfHtml(operacion: OperacionStock & { 
    detalles?: (DetalleOperacion & { producto?: Product })[]; 
    personal?: Personal;
    sede_origen?: Sede;
    sede_destino?: Sede;
    proveedor?: Supplier;
  }): string {
    const tipoOperacionLabel = {
      'ENTRADA': 'ENTRADA (COMPRA)',
      'SALIDA': 'SALIDA (VENTA)',
      'TRASPASO': 'TRASPASO'
    }[operacion.tipo_operacion];

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

    const detallesHtml = (operacion.detalles || []).map(d => {
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
}

export default new OperacionStockController();
