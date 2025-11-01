import { Request, Response } from 'express';
import Supplier from '../models/Supplier';
import { Op } from 'sequelize';

export const obtenerProveedores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10, busqueda, activo } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { ruc_dni: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const { count, rows } = await Supplier.findAndCountAll({
      where,
      limit: Number(limite),
      offset,
      order: [['nombre', 'ASC']]
    });

    res.json({
      proveedores: rows,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ mensaje: 'Error al obtener proveedores' });
  }
};

export const obtenerProveedorPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const proveedor = await Supplier.findByPk(id);

    if (!proveedor) {
      res.status(404).json({ mensaje: 'Proveedor no encontrado' });
      return;
    }

    res.json(proveedor);
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ mensaje: 'Error al obtener proveedor' });
  }
};

export const crearProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      ruc_dni,
      contacto_telefono,
      contacto_email,
      direccion,
      condiciones_pago
    } = req.body;

    if (!nombre || !ruc_dni) {
      res.status(400).json({ mensaje: 'Nombre y RUC/DNI son requeridos' });
      return;
    }

    const proveedor = await Supplier.create({
      nombre,
      ruc_dni,
      contacto_telefono,
      contacto_email,
      direccion,
      condiciones_pago
    });

    res.status(201).json({
      mensaje: 'Proveedor creado exitosamente',
      proveedor
    });
  } catch (error: any) {
    console.error('Error al crear proveedor:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El RUC/DNI ya está registrado' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al crear proveedor' });
  }
};

export const actualizarProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const proveedor = await Supplier.findByPk(id);

    if (!proveedor) {
      res.status(404).json({ mensaje: 'Proveedor no encontrado' });
      return;
    }

    // Si se actualiza el RUC/DNI, verificar que no existe en otro proveedor
    if (datos.ruc_dni && datos.ruc_dni !== proveedor.ruc_dni) {
      const proveedorExistente = await Supplier.findOne({ where: { ruc_dni: datos.ruc_dni } });
      if (proveedorExistente) {
        res.status(400).json({ mensaje: 'El RUC/DNI ya está registrado' });
        return;
      }
    }

    await proveedor.update(datos);

    res.json({
      mensaje: 'Proveedor actualizado exitosamente',
      proveedor
    });
  } catch (error: any) {
    console.error('Error al actualizar proveedor:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El RUC/DNI ya está registrado' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al actualizar proveedor' });
  }
};

export const eliminarProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const proveedor = await Supplier.findByPk(id);

    if (!proveedor) {
      res.status(404).json({ mensaje: 'Proveedor no encontrado' });
      return;
    }

    // Soft delete: marcar como inactivo
    await proveedor.update({ activo: false });

    res.json({ mensaje: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ mensaje: 'Error al eliminar proveedor' });
  }
};

