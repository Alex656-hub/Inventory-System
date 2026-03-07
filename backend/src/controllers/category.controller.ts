import { Request, Response } from 'express';
import Category from '../models/Category';
import { Op } from 'sequelize';

export const obtenerCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activa, busqueda } = req.query;

    const where: any = {};
    if (activa !== undefined) {
      where.activa = activa === 'true';
    }

    if (busqueda) {
      const busquedaStr = busqueda as string;
      const idNum = parseInt(busquedaStr);
      
      // If search term is purely numeric, only search by ID
      if (!isNaN(idNum) && busquedaStr.trim() === idNum.toString()) {
        where.id = idNum;
      } else {
        // Otherwise, search by name and description
        where[Op.or] = [
          { nombre: { [Op.iLike]: `%${busquedaStr}%` } },
          { descripcion: { [Op.iLike]: `%${busquedaStr}%` } }
        ];
      }
    }

    const categorias = await Category.findAll({
      where,
      order: [['id', 'ASC']]
    });

    res.json({ categorias });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ mensaje: 'Error al obtener categorías' });
  }
};

export const obtenerCategoriaPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const categoria = await Category.findByPk(id);

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    res.json(categoria);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ mensaje: 'Error al obtener categoría' });
  }
};

export const crearCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, nombre, descripcion } = req.body;

    if (!nombre) {
      res.status(400).json({ mensaje: 'El nombre es requerido' });
      return;
    }

    let categoryId = id;
    if (!id) {
      // Find the smallest available ID
      const existingCategories = await Category.findAll({
        attributes: ['id'],
        order: [['id', 'ASC']]
      });
      
      const existingIds = existingCategories.map(c => c.id);
      let nextId = 1;
      
      while (existingIds.includes(nextId)) {
        nextId++;
      }
      
      categoryId = nextId;
    }

    const categoria = await Category.create({ id: categoryId, nombre, descripcion });

    res.status(201).json({
      mensaje: 'Categoría creada exitosamente',
      categoria
    });
  } catch (error: any) {
    console.error('Error al crear categoría:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El nombre de categoría ya existe' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al crear categoría' });
  }
};

export const actualizarCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const categoria = await Category.findByPk(id);

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    await categoria.update(datos);

    res.json({
      mensaje: 'Categoría actualizada exitosamente',
      categoria
    });
  } catch (error: any) {
    console.error('Error al actualizar categoría:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El nombre de categoría ya existe' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al actualizar categoría' });
  }
};

export const eliminarCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const categoria = await Category.findByPk(id);

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    // Soft delete: marcar como inactiva
    await categoria.update({ activa: false });

    res.json({ mensaje: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ mensaje: 'Error al eliminar categoría' });
  }
};

export const eliminarCategoriaHard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const categoria = await Category.findByPk(id);

    if (!categoria) {
      res.status(404).json({ mensaje: 'Categoría no encontrada' });
      return;
    }

    // Hard delete: eliminar permanentemente
    await categoria.destroy();

    res.json({ mensaje: 'Categoría eliminada permanentemente' });
  } catch (error) {
    console.error('Error al eliminar categoría permanentemente:', error);
    res.status(500).json({ mensaje: 'Error al eliminar categoría permanentemente' });
  }
};

