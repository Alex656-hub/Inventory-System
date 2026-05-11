import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import OperacionStock from '../models/OperacionStock';
import DetalleOperacion from '../models/DetalleOperacion';
import StockPorSede from '../models/StockPorSede';
import Product from '../models/Product';
import MovimientoInventario from '../models/MovimientoInventario';
import User from '../models/User';
import Sede from '../models/Sede';
import Supplier from '../models/Supplier';
import Client from '../models/Client';
import { sequelize } from '../config/database';
import { Transaction } from 'sequelize';

interface OperacionRequest {
  tipo_operacion: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  fecha_emision: Date;
  responsable_fisico_id: number;
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
  // Crear nueva operación
  async crearOperacion(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const operacionData: OperacionRequest = req.body;

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
        // Crear operación principal
        const operacion = await OperacionStock.create({
          ...operacionData,
          total_unidades,
          costo_total,
          estado: 'BORRADOR'
        }, { transaction: t });

        // Crear detalles y calcular subtotales
        const detallesConSubtotal = operacionData.detalles.map(detalle => ({
          ...detalle,
          operacion_id: operacion.id,
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
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Procesar operación (actualizar stock)
  async procesarOperacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const operacion = await OperacionStock.findByPk(id, {
        include: [
          { model: DetalleOperacion, as: 'detalles' }
        ]
      }) as OperacionStock & { detalles: DetalleOperacion[] };

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

        // Actualizar estado de la operación
        await operacion.update({ estado: 'PROCESADO' }, { transaction: t });
      });

      res.json({
        message: 'Operación procesada exitosamente',
        operacion
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

      const stock = await StockPorSede.findOne({
        where: {
          producto_id: productoId,
          sede_id: sedeId
        },
        include: [
          { model: Product, as: 'producto' }
        ]
      });

      if (!stock) {
        return res.json({
          producto_id: parseInt(productoId),
          sede_id: parseInt(sedeId),
          cantidad_actual: 0,
          stock_minimo: 0,
          disponible: true
        });
      }

      res.json({
        ...stock.toJSON(),
        disponible: stock.cantidad_actual > 0
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
          { model: User, as: 'responsable', attributes: ['id', 'nombre', 'email'] },
          { model: Sede, as: 'sede_origen', attributes: ['id', 'nombre'] },
          { model: Sede, as: 'sede_destino', attributes: ['id', 'nombre'] },
          { model: Supplier, as: 'proveedor', attributes: ['id', 'nombre'] },
          { model: Client, as: 'cliente', attributes: ['id', 'nombre'] }
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
        await this.procesarEntrada(producto_id, operacion.sede_destino_id!, cantidad, costo_unitario, transaction);
        break;
      case 'SALIDA':
        await this.procesarSalida(producto_id, operacion.sede_origen_id!, cantidad, costo_unitario, transaction);
        break;
      case 'TRASPASO':
        await this.procesarTraspaso(producto_id, operacion.sede_origen_id!, operacion.sede_destino_id!, cantidad, costo_unitario, transaction);
        break;
    }
  }

  private async procesarEntrada(productoId: number, sedeId: number, cantidad: number, costoUnitario: number, transaction: Transaction) {
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

    // Crear movimiento histórico
    await MovimientoInventario.create({
      producto_id: productoId,
      tipo_movimiento: 'entrada',
      cantidad: cantidad,
      precio_unitario: costoUnitario,
      stock_anterior: created ? 0 : stock.cantidad_actual - cantidad,
      stock_nuevo: stock.cantidad_actual,
      usuario_id: 1, // TODO: Obtener del token
      fecha: new Date(),
      motivo: 'Entrada de inventario'
    }, { transaction });
  }

  private async procesarSalida(productoId: number, sedeId: number, cantidad: number, costoUnitario: number, transaction: Transaction) {
    const stock = await StockPorSede.findOne({
      where: { producto_id: productoId, sede_id: sedeId },
      transaction
    });

    if (!stock || stock.cantidad_actual < cantidad) {
      throw new Error('Stock insuficiente para la salida');
    }

    await stock.update({
      cantidad_actual: stock.cantidad_actual - cantidad,
      ultimo_movimiento: new Date()
    }, { transaction });

    await MovimientoInventario.create({
      producto_id: productoId,
      tipo_movimiento: 'salida',
      cantidad: cantidad,
      precio_unitario: costoUnitario,
      stock_anterior: stock.cantidad_actual + cantidad,
      stock_nuevo: stock.cantidad_actual,
      usuario_id: 1, // TODO: Obtener del token
      fecha: new Date(),
      motivo: 'Salida de inventario'
    }, { transaction });
  }

  private async procesarTraspaso(productoId: number, sedeOrigenId: number, sedeDestinoId: number, cantidad: number, costoUnitario: number, transaction: Transaction) {
    // Procesar salida del origen
    await this.procesarSalida(productoId, sedeOrigenId, cantidad, costoUnitario, transaction);
    
    // Procesar entrada en destino
    await this.procesarEntrada(productoId, sedeDestinoId, cantidad, costoUnitario, transaction);
  }
}

export default new OperacionStockController();
