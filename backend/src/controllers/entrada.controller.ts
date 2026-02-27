import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import EntradaInventario from '../models/EntradaInventario';
import DetalleEntrada from '../models/DetalleEntrada';
import Product from '../models/Product';
import MovimientoInventario from '../models/MovimientoInventario';
import Supplier from '../models/Supplier';
import User from '../models/User';
import { alertService } from '../services/alertService';

export const obtenerEntradas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10, fecha_desde, fecha_hasta, proveedor_id } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
      if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
    }

    if (proveedor_id) {
      where.proveedor_id = proveedor_id;
    }

    const { count, rows } = await EntradaInventario.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'proveedor', attributes: ['id', 'nombre'] },
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ],
      limit: Number(limite),
      offset,
      order: [['fecha', 'DESC']]
    });

    res.json({
      entradas: rows,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener entradas:', error);
    res.status(500).json({ mensaje: 'Error al obtener entradas' });
  }
};

export const obtenerEntradaPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const entrada = await EntradaInventario.findByPk(id, {
      include: [
        { model: Supplier, as: 'proveedor' },
        { model: User, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
      ]
    });

    if (entrada) {
      const detalles = await DetalleEntrada.findAll({
        where: { entrada_id: entrada.id },
        include: [{ model: Product, as: 'producto' }]
      });
      (entrada as any).detalles = detalles;
    }

    if (!entrada) {
      res.status(404).json({ mensaje: 'Entrada no encontrada' });
      return;
    }

    res.json(entrada);
  } catch (error) {
    console.error('Error al obtener entrada:', error);
    res.status(500).json({ mensaje: 'Error al obtener entrada' });
  }
};

export const crearEntrada = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const {
      numero_documento,
      fecha,
      proveedor_id,
      tipo_documento,
      numero_serie,
      forma_pago,
      observaciones,
      detalles
    } = req.body;

    if (!req.usuario) {
      res.status(401).json({ mensaje: 'Usuario no autenticado' });
      return;
    }

    if (!numero_documento || !fecha || !proveedor_id || !detalles || detalles.length === 0) {
      res.status(400).json({ mensaje: 'Datos incompletos' });
      return;
    }

    // Calcular total
    let total = 0;
    for (const detalle of detalles) {
      const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
      total += subtotal;
    }

    // Crear entrada
    const entrada = await EntradaInventario.create({
      numero_documento,
      fecha,
      proveedor_id,
      usuario_id: req.usuario.id,
      tipo_documento: tipo_documento || 'factura',
      numero_serie,
      total,
      forma_pago: forma_pago || 'contado',
      estado: 'pagado',
      observaciones
    }, { transaction });

    // Crear detalles y actualizar stock
    for (const detalle of detalles) {
      const producto = await Product.findByPk(detalle.producto_id, { transaction });
      
      if (!producto) {
        throw new Error(`Producto ${detalle.producto_id} no encontrado`);
      }

      const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
      
      await DetalleEntrada.create({
        entrada_id: entrada.id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        subtotal
      }, { transaction });

      // Actualizar stock del producto
      const stockAnterior = producto.stock_actual;
      const stockNuevo = stockAnterior + Number(detalle.cantidad);
      
      // Actualizar precio de compra si es necesario
      await producto.update({
        stock_actual: stockNuevo,
        precio_compra: detalle.precio_unitario // Actualizar último precio de compra
      }, { transaction });

      // Registrar movimiento
      await MovimientoInventario.create({
        producto_id: detalle.producto_id,
        tipo_movimiento: 'entrada',
        referencia_id: entrada.id,
        tipo_referencia: 'compra',
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        usuario_id: req.usuario.id,
        fecha: entrada.fecha,
        motivo: `Compra - ${entrada.numero_documento}`
      }, { transaction });
    }

    await transaction.commit();

    // Verificar alertas de sobrestock después de la entrada
    try {
      await alertService.checkOverstock();
    } catch (alertError) {
      console.error('Error al verificar alertas de sobrestock después de entrada:', alertError);
    }

    const entradaCompleta = await EntradaInventario.findByPk(entrada.id, {
      include: [
        { model: Supplier, as: 'proveedor' },
        { model: User, as: 'usuario', attributes: ['id', 'nombre'] }
      ]
    });

    if (entradaCompleta) {
      const detalles = await DetalleEntrada.findAll({
        where: { entrada_id: entradaCompleta.id },
        include: [{ model: Product, as: 'producto' }]
      });
      (entradaCompleta as any).detalles = detalles;
    }

    res.status(201).json({
      mensaje: 'Entrada registrada exitosamente',
      entrada: entradaCompleta
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear entrada:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear entrada',
      error: error.message 
    });
  }
};

export const eliminarEntrada = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const entrada = await EntradaInventario.findByPk(id, { transaction });

    if (!entrada) {
      await transaction.rollback();
      res.status(404).json({ mensaje: 'Entrada no encontrada' });
      return;
    }

    const detalles = await DetalleEntrada.findAll({
      where: { entrada_id: id },
      transaction
    });

    // Revertir stock de productos
    for (const detalle of detalles) {
      const producto = await Product.findByPk(detalle.producto_id, { transaction });
      
      if (producto) {
        const stockAnterior = producto.stock_actual;
        const stockNuevo = stockAnterior - detalle.cantidad;
        
        if (stockNuevo < 0) {
          throw new Error(`No se puede eliminar: stock insuficiente para producto ${producto.nombre}`);
        }

        await producto.update({ stock_actual: stockNuevo }, { transaction });

        // Registrar movimiento de reversión
        await MovimientoInventario.create({
          producto_id: detalle.producto_id,
          tipo_movimiento: 'ajuste',
          referencia_id: entrada.id,
          tipo_referencia: 'eliminacion_compra',
          cantidad: -detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          usuario_id: req.usuario?.id || 1,
          motivo: `Eliminación de compra - ${entrada.numero_documento}`
        }, { transaction });
      }
    }

    // Eliminar detalles y entrada
    await DetalleEntrada.destroy({ where: { entrada_id: id }, transaction });
    await entrada.destroy({ transaction });

    await transaction.commit();

    res.json({ mensaje: 'Entrada eliminada exitosamente' });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al eliminar entrada:', error);
    res.status(500).json({ 
      mensaje: 'Error al eliminar entrada',
      error: error.message 
    });
  }
};

