import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import SalidaInventario from '../models/SalidaInventario';
import DetalleSalida from '../models/DetalleSalida';
import Product from '../models/Product';
import MovimientoInventario from '../models/MovimientoInventario';
import User from '../models/User';

export const obtenerSalidas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10, fecha_desde, fecha_hasta } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
    }

    const { count, rows } = await SalidaInventario.findAndCountAll({
      where,
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      limit: Number(limite),
      offset,
      order: [['fecha', 'DESC']]
    });

    res.json({
      salidas: rows,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener salidas:', error);
    res.status(500).json({ mensaje: 'Error al obtener salidas' });
  }
};

export const obtenerSalidaPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const salida = await SalidaInventario.findByPk(id, {
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
      ]
    });

    if (salida) {
      const detalles = await DetalleSalida.findAll({
        where: { salida_id: salida.id },
        include: [{ model: Product, as: 'producto' }]
      });
      (salida as any).detalles = detalles;
    }

    if (!salida) {
      res.status(404).json({ mensaje: 'Salida no encontrada' });
      return;
    }

    res.json(salida);
  } catch (error) {
    console.error('Error al obtener salida:', error);
    res.status(500).json({ mensaje: 'Error al obtener salida' });
  }
};

export const crearSalida = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const {
      numero_documento,
      fecha,
      cliente_nombre,
      cliente_documento,
      tipo_documento,
      numero_serie,
      metodo_pago,
      observaciones,
      detalles
    } = req.body;

    if (!req.usuario) {
      res.status(401).json({ mensaje: 'Usuario no autenticado' });
      return;
    }

    if (!numero_documento || !fecha || !detalles || detalles.length === 0) {
      res.status(400).json({ mensaje: 'Datos incompletos' });
      return;
    }

    // Verificar stock disponible antes de procesar
    for (const detalle of detalles) {
      const producto = await Product.findByPk(detalle.producto_id, { transaction });
      
      if (!producto) {
        throw new Error(`Producto ${detalle.producto_id} no encontrado`);
      }

      if (producto.stock_actual < detalle.cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}, Solicitado: ${detalle.cantidad}`);
      }
    }

    // Calcular total
    let total = 0;
    for (const detalle of detalles) {
      const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
      total += subtotal;
    }

    // Crear salida
    const salida = await SalidaInventario.create({
      numero_documento,
      fecha,
      cliente_nombre,
      cliente_documento,
      usuario_id: req.usuario.id,
      tipo_documento: tipo_documento || 'boleta',
      numero_serie,
      total,
      metodo_pago: metodo_pago || 'efectivo',
      estado: 'completado',
      observaciones
    }, { transaction });

    // Crear detalles y actualizar stock
    for (const detalle of detalles) {
      const producto = await Product.findByPk(detalle.producto_id, { transaction });
      
      const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
      
      await DetalleSalida.create({
        salida_id: salida.id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        subtotal
      }, { transaction });

      // Actualizar stock del producto
      const stockAnterior = producto!.stock_actual;
      const stockNuevo = stockAnterior - Number(detalle.cantidad);
      
      await producto!.update({
        stock_actual: stockNuevo
      }, { transaction });

      // Registrar movimiento
      await MovimientoInventario.create({
        producto_id: detalle.producto_id,
        tipo_movimiento: 'salida',
        referencia_id: salida.id,
        tipo_referencia: 'venta',
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        usuario_id: req.usuario.id,
        fecha: salida.fecha,
        motivo: `Venta - ${salida.numero_documento}`
      }, { transaction });
    }

    await transaction.commit();

    const salidaCompleta = await SalidaInventario.findByPk(salida.id, {
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ]
    });

    if (salidaCompleta) {
      const detalles = await DetalleSalida.findAll({
        where: { salida_id: salidaCompleta.id },
        include: [{ model: Product, as: 'producto' }]
      });
      (salidaCompleta as any).detalles = detalles;
    }

    res.status(201).json({
      mensaje: 'Salida registrada exitosamente',
      salida: salidaCompleta
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear salida:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear salida',
      error: error.message 
    });
  }
};

export const eliminarSalida = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const salida = await SalidaInventario.findByPk(id, { transaction });

    if (!salida) {
      await transaction.rollback();
      res.status(404).json({ mensaje: 'Salida no encontrada' });
      return;
    }

    const detalles = await DetalleSalida.findAll({
      where: { salida_id: id },
      transaction
    });

    if (salida.estado === 'cancelado') {
      res.status(400).json({ mensaje: 'La salida ya está cancelada' });
      return;
    }

    // Revertir stock de productos
    for (const detalle of detalles) {
      const producto = await Product.findByPk(detalle.producto_id, { transaction });
      
      if (producto) {
        const stockAnterior = producto.stock_actual;
        const stockNuevo = stockAnterior + detalle.cantidad;
        
        await producto.update({ stock_actual: stockNuevo }, { transaction });

        // Registrar movimiento de reversión
        await MovimientoInventario.create({
          producto_id: detalle.producto_id,
          tipo_movimiento: 'ajuste',
          referencia_id: salida.id,
          tipo_referencia: 'eliminacion_venta',
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          usuario_id: req.usuario?.id || 1,
          motivo: `Eliminación de venta - ${salida.numero_documento}`
        }, { transaction });
      }
    }

    // Marcar como cancelada en lugar de eliminar
    await salida.update({ estado: 'cancelado' }, { transaction });

    await transaction.commit();

    res.json({ mensaje: 'Salida cancelada exitosamente' });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al eliminar salida:', error);
    res.status(500).json({ 
      mensaje: 'Error al eliminar salida',
      error: error.message 
    });
  }
};

