import { Request, Response } from 'express';
import { Op } from 'sequelize';
import MovimientoInventario from '../models/MovimientoInventario';
import Product from '../models/Product';
import User from '../models/User';

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

