import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import Supplier from '../models/Supplier';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export const obtenerProductos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10, busqueda, categoria_id, activo } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (busqueda) {
      where[Op.or] = [
        { codigo: { [Op.iLike]: `%${busqueda}%` } },
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }

    if (categoria_id) {
      where.categoria_id = categoria_id;
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Supplier, as: 'proveedor', attributes: ['id', 'nombre'] }
      ],
      limit: Number(limite),
      offset,
      order: [['nombre', 'ASC']]
    });

    res.json({
      productos: rows,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
};

export const obtenerProductoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const producto = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'categoria' },
        { model: Supplier, as: 'proveedor' }
      ]
    });

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    res.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ mensaje: 'Error al obtener producto' });
  }
};

export const crearProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      proveedor_id,
      precio_compra,
      precio_venta,
      stock_actual,
      stock_minimo,
      ubicacion
    } = req.body;

    // Validar campos requeridos
    if (!codigo || !nombre || !categoria_id || !proveedor_id || !precio_compra || !precio_venta) {
      res.status(400).json({ mensaje: 'Campos requeridos: codigo, nombre, categoria_id, proveedor_id, precio_compra, precio_venta' });
      return;
    }

    // Verificar que la categoría existe
    const categoria = await Category.findByPk(categoria_id);
    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    // Verificar que la categoría esté activa
    if (!categoria.activa) {
      res.status(400).json({ mensaje: 'La categoría está inactiva, no se puede registrar productos en ella.' });
      return;
    }

    // Verificar que el proveedor existe
    const proveedor = await Supplier.findByPk(proveedor_id);
    if (!proveedor) {
      res.status(404).json({ mensaje: 'Proveedor no encontrado' });
      return;
    }

    // Verificar que el código no existe
    const productoExistente = await Product.findOne({ where: { codigo } });
    if (productoExistente) {
      res.status(400).json({ mensaje: 'El código de producto ya existe' });
      return;
    }

    const producto = await Product.create({
      codigo,
      nombre,
      descripcion,
      categoria_id,
      proveedor_id,
      precio_compra: Number(precio_compra),
      precio_venta: Number(precio_venta),
      stock_actual: stock_actual || 0,
      stock_minimo: stock_minimo || 0,
      ubicacion
    });

    const productoCompleto = await Product.findByPk(producto.id, {
      include: [
        { model: Category, as: 'categoria' },
        { model: Supplier, as: 'proveedor' }
      ]
    });

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto: productoCompleto
    });
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El código de producto ya existe' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al crear producto' });
  }
};

export const actualizarProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const producto = await Product.findByPk(id);

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    // Si se actualiza la categoría, verificar que existe
    if (datos.categoria_id) {
      const categoria = await Category.findByPk(datos.categoria_id);
      if (!categoria) {
        res.status(404).json({ mensaje: 'Categoría no encontrada' });
        return;
      }

      // Verificar que la categoría esté activa
      if (!categoria.activa) {
        res.status(400).json({ mensaje: 'La categoría está inactiva, no se puede registrar productos en ella.' });
        return;
      }
    }

    // Si se actualiza el proveedor, verificar que existe
    if (datos.proveedor_id) {
      const proveedor = await Supplier.findByPk(datos.proveedor_id);
      if (!proveedor) {
        res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        return;
      }
    }

    // Si se actualiza el código, verificar que no existe en otro producto
    if (datos.codigo && datos.codigo !== producto.codigo) {
      const productoExistente = await Product.findOne({ where: { codigo: datos.codigo } });
      if (productoExistente) {
        res.status(400).json({ mensaje: 'El código de producto ya existe' });
        return;
      }
    }

    await producto.update(datos);

    const productoActualizado = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'categoria' },
        { model: Supplier, as: 'proveedor' }
      ]
    });

    res.json({
      mensaje: 'Producto actualizado exitosamente',
      producto: productoActualizado
    });
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El código de producto ya existe' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al actualizar producto' });
  }
};

export const eliminarProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const producto = await Product.findByPk(id);

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    // Soft delete: marcar como inactivo
    await producto.update({ activo: false });

    res.json({ mensaje: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ mensaje: 'Error al eliminar producto' });
  }
};

export const obtenerSiguienteCodigo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoria_id } = req.params;

    if (!categoria_id) {
      res.status(400).json({ mensaje: 'categoria_id requerido' });
      return;
    }

    // Buscar la categoría
    const categoria = await Category.findByPk(categoria_id);
    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    const prefix = categoria.nombre.substring(0, 3).toUpperCase();

    // Buscar códigos existentes para esta categoría
    const productos = await Product.findAll({
      where: { categoria_id },
      attributes: ['codigo']
    });

    let maxNum = 0;
    productos.forEach(p => {
      if (p.codigo.startsWith(prefix)) {
        const numPart = p.codigo.slice(3);
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    const code = prefix + ('000' + nextNum).slice(-3);

    res.json({ codigo: code });
  } catch (error) {
    console.error('Error al obtener siguiente código:', error);
    res.status(500).json({ mensaje: 'Error al obtener siguiente código' });
  }
};

export const obtenerProductosStockBajo = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener todos los productos activos y filtrar en memoria
    // Alternativa: usar una consulta SQL raw si la base de datos es muy grande
    const productos = await Product.findAll({
      where: {
        activo: true
      },
      include: [
        { model: Category, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Supplier, as: 'proveedor', attributes: ['id', 'nombre'] }
      ],
      order: [['stock_actual', 'ASC']]
    });

    // Filtrar productos donde stock_actual <= stock_minimo
    const productosStockBajo = productos.filter(
      (producto) => producto.stock_actual <= producto.stock_minimo
    );

    res.json({ productos: productosStockBajo });
  } catch (error) {
    console.error('Error al obtener productos con stock bajo:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos con stock bajo' });
  }
};

