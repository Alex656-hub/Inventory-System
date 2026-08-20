import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import Supplier from '../models/Supplier';
import UnidadMedida from '../models/UnidadMedida';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import path from 'path';
import fs from 'fs';
import { descuentoService } from '../services/descuentoService';

const PRODUCTS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products');

function ensureUploadsDir() {
  if (!fs.existsSync(PRODUCTS_UPLOAD_DIR)) {
    fs.mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true });
  }
}

function toNullableNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBoolFromQuery(value: any): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

function buildImageUrl(req: Request, imageFilename?: string | null): string | null {
  if (!imageFilename) return null;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/products/${encodeURIComponent(imageFilename)}`;
}

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

    const activoBool = toBoolFromQuery(activo);
    if (activoBool !== undefined) where.activo = activoBool;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Supplier, as: 'proveedor', attributes: ['id', 'nombre'] },
        { model: UnidadMedida, as: 'unidad', attributes: ['id', 'nombre', 'abreviatura'] }
      ],
      limit: Number(limite),
      offset,
      order: [['nombre', 'ASC']]
    });

    const descuentosEfectivos = await descuentoService.getDescuentosEfectivos(rows as any);

    res.json({
      productos: rows.map((p: any) => {
        const eff = descuentosEfectivos.get(p.id);
        return {
          ...p.toJSON(),
          imageUrl: buildImageUrl(req, p.image_filename),
          descuento_promocion: eff?.descuento_promocion ?? (Number(p.descuento_promocion) || 0),
          promocion_hasta: eff?.promocion_hasta ?? p.promocion_hasta ?? null,
          descuento_fuente: eff?.fuente ?? 'legacy'
        };
      }),
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
        { model: Supplier, as: 'proveedor' },
        { model: UnidadMedida, as: 'unidad' }
      ]
    });

    if (!producto) {
      res.status(404).json({ mensaje: 'Producto no encontrado' });
      return;
    }

    res.json({
      ...producto.toJSON(),
      imageUrl: buildImageUrl(req, (producto as any).image_filename)
    });
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
      unidad_id,
      precio_compra,
      precio_venta,
      descuento_promocion,
      promocion_hasta,
      stock_actual,
      stock_minimo,
      ubicacion
    } = req.body;

    // Validar campos requeridos
    if (!codigo || !nombre || !categoria_id || !precio_compra || !precio_venta) {
      res.status(400).json({ mensaje: 'Campos requeridos: codigo, nombre, categoria_id, precio_compra, precio_venta' });
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

    // Verificar proveedor (si se envía)
    const proveedorIdNum = toNullableNumber(proveedor_id);
    if (proveedorIdNum !== null) {
      const proveedor = await Supplier.findByPk(proveedorIdNum);
      if (!proveedor) {
        res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        return;
      }
    }

    // Verificar unidad (si se envía)
    const unidadIdNum = toNullableNumber(unidad_id);
    if (unidadIdNum !== null) {
      const unidad = await UnidadMedida.findByPk(unidadIdNum);
      if (!unidad) {
        res.status(404).json({ mensaje: 'Unidad no encontrada' });
        return;
      }
      if (!unidad.estado) {
        res.status(400).json({ mensaje: 'La unidad está inactiva.' });
        return;
      }
    }

    // Verificar que el código no existe
    const productoExistente = await Product.findOne({ where: { codigo } });
    if (productoExistente) {
      res.status(400).json({ mensaje: 'El código de producto ya existe' });
      return;
    }

    // Manejo de imagen (multipart)
    let imageFilename: string | null = null;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (file) {
      ensureUploadsDir();
      const safeBase = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      imageFilename = `${safeBase}${ext}`;
      fs.writeFileSync(path.join(PRODUCTS_UPLOAD_DIR, imageFilename), file.buffer);
    }

    const producto = await Product.create({
      codigo,
      nombre,
      descripcion,
      categoria_id,
      proveedor_id: proveedorIdNum ?? undefined,
      unidad_id: unidadIdNum ?? undefined,
      precio_compra: Number(precio_compra),
      precio_venta: Number(precio_venta),
      descuento_promocion: toNullableNumber(descuento_promocion) ?? undefined,
      promocion_hasta: promocion_hasta || null,
      stock_actual: stock_actual || 0,
      stock_minimo: stock_minimo || 0,
      ubicacion,
      image_filename: imageFilename ?? undefined
    });

    const productoCompleto = await Product.findByPk(producto.id, {
      include: [
        { model: Category, as: 'categoria' },
        { model: Supplier, as: 'proveedor' },
        { model: UnidadMedida, as: 'unidad' }
      ]
    });

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto: {
        ...(productoCompleto as any).toJSON(),
        imageUrl: buildImageUrl(req, (productoCompleto as any).image_filename)
      }
    });
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    console.error('Stack:', error?.stack);
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

    // Si se actualiza la unidad, verificar que existe
    if (datos.unidad_id) {
      const unidad = await UnidadMedida.findByPk(datos.unidad_id);
      if (!unidad) {
        res.status(404).json({ mensaje: 'Unidad no encontrada' });
        return;
      }
      if (!unidad.estado) {
        res.status(400).json({ mensaje: 'La unidad está inactiva.' });
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

    // Manejo de imagen (multipart)
    const file = (req as any).file as Express.Multer.File | undefined;

    if (file) {
      ensureUploadsDir();
      const safeBase = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      const imageFilename = `${safeBase}${ext}`;
      fs.writeFileSync(path.join(PRODUCTS_UPLOAD_DIR, imageFilename), file.buffer);

      // Borrar imagen anterior si existía
      const prev = (producto as any).image_filename as string | undefined;
      if (prev) {
        const prevPath = path.join(PRODUCTS_UPLOAD_DIR, prev);
        if (fs.existsSync(prevPath)) {
          try { fs.unlinkSync(prevPath); } catch {}
        }
      }

      datos.image_filename = imageFilename;
    }

    // Normalizar proveedor_id/unidad_id si vienen vacíos
    if (datos.proveedor_id === '' || datos.proveedor_id === null) datos.proveedor_id = null;
    if (datos.unidad_id === '' || datos.unidad_id === null) datos.unidad_id = null;

    // Normalizar campos de promoción (vacíos => null)
    if (datos.descuento_promocion === '' || datos.descuento_promocion === null || datos.descuento_promocion === undefined) {
      datos.descuento_promocion = null;
    } else {
      const desc = Number(datos.descuento_promocion);
      if (!Number.isFinite(desc) || desc < 0 || desc > 100) {
        res.status(400).json({ mensaje: 'Descuento promocional debe estar entre 0 y 100' });
        return;
      }
      datos.descuento_promocion = desc;
      if (desc === 0) datos.descuento_promocion = null;
    }
    if (datos.promocion_hasta === '' || datos.promocion_hasta === null || datos.promocion_hasta === undefined) {
      datos.promocion_hasta = null;
    }

    // No permitir sobrescribir image_filename si no se subió un archivo nuevo
    if (!file) {
      delete datos.image_filename;
    }

    await producto.update(datos);

    const productoActualizado = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'categoria' },
        { model: Supplier, as: 'proveedor' },
        { model: UnidadMedida, as: 'unidad' }
      ]
    });

    res.json({
      mensaje: 'Producto actualizado exitosamente',
      producto: {
        ...(productoActualizado as any).toJSON(),
        imageUrl: buildImageUrl(req, (productoActualizado as any).image_filename)
      }
    });
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);
    console.error('Stack:', error?.stack);
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

    // Criterio unificado de stock bajo (alineado con Alertas):
    // - Con stock mínimo configurado (>0): stock_actual <= stock_minimo
    // - Sin stock mínimo (0): stock_actual entre 1 y 5 (stock crítico)
    const productosStockBajo = productos.filter(
      (producto) =>
        (producto.stock_minimo > 0 && producto.stock_actual <= producto.stock_minimo) ||
        (producto.stock_minimo === 0 && producto.stock_actual > 0 && producto.stock_actual <= 5)
    );

    res.json({ productos: productosStockBajo });
  } catch (error) {
    console.error('Error al obtener productos con stock bajo:', error);
    res.status(500).json({ mensaje: 'Error al obtener productos con stock bajo' });
  }
};

