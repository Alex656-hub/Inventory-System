import { Request, Response } from 'express';
import Personal from '../models/Personal';
import { Op } from 'sequelize';

export const obtenerPersonal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { activo, busqueda } = req.query;

    const where: any = {};
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    if (busqueda) {
      const busquedaStr = busqueda as string;
      const idNum = parseInt(busquedaStr);
      
      // If search term is purely numeric, only search by ID
      if (!isNaN(idNum) && busquedaStr.trim() === idNum.toString()) {
        where.id = idNum;
      } else {
        // Otherwise, search by name and cargo
        where[Op.or] = [
          { nombreCompleto: { [Op.iLike]: `%${busquedaStr}%` } },
          { cargo: { [Op.iLike]: `%${busquedaStr}%` } },
          { telefono: { [Op.iLike]: `%${busquedaStr}%` } }
        ];
      }
    }

    const personal = await Personal.findAll({
      where,
      order: [['id', 'ASC']]
    });

    res.json({ personal });
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({ mensaje: 'Error al obtener personal' });
  }
};

export const obtenerPersonalPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const personalItem = await Personal.findByPk(id);

    if (!personalItem) {
      res.status(404).json({ mensaje: 'Personal no encontrado' });
      return;
    }

    res.json(personalItem);
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({ mensaje: 'Error al obtener personal' });
  }
};

export const crearPersonal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombreCompleto, cargo, telefono } = req.body;

    if (!nombreCompleto) {
      res.status(400).json({ mensaje: 'El nombre completo es requerido' });
      return;
    }

    if (!cargo) {
      res.status(400).json({ mensaje: 'El cargo es requerido' });
      return;
    }

    if (!['Almacenero', 'Repartidor'].includes(cargo)) {
      res.status(400).json({ mensaje: 'El cargo debe ser Almacenero o Repartidor' });
      return;
    }

    const personal = await Personal.create({ 
      nombreCompleto: nombreCompleto.trim(), 
      cargo: cargo.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true
    });

    res.status(201).json({
      mensaje: 'Personal creado exitosamente',
      personal
    });
  } catch (error: any) {
    console.error('Error al crear personal:', error);
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map((e: any) => e.message);
      res.status(400).json({ mensaje: 'Error de validación', errors });
      return;
    }
    res.status(500).json({ mensaje: 'Error al crear personal' });
  }
};

export const actualizarPersonal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const personal = await Personal.findByPk(id);

    if (!personal) {
      res.status(404).json({ mensaje: 'Personal no encontrado' });
      return;
    }

    // Validar cargo si se está actualizando
    if (datos.cargo && !['Almacenero', 'Repartidor'].includes(datos.cargo)) {
      res.status(400).json({ mensaje: 'El cargo debe ser Almacenero o Repartidor' });
      return;
    }

    // Limpiar datos
    if (datos.nombreCompleto) {
      datos.nombreCompleto = datos.nombreCompleto.trim();
    }
    if (datos.cargo) {
      datos.cargo = datos.cargo.trim();
    }
    if (datos.telefono) {
      datos.telefono = datos.telefono.trim();
    }

    await personal.update(datos);

    res.json({
      mensaje: 'Personal actualizado exitosamente',
      personal
    });
  } catch (error: any) {
    console.error('Error al actualizar personal:', error);
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map((e: any) => e.message);
      res.status(400).json({ mensaje: 'Error de validación', errors });
      return;
    }
    res.status(500).json({ mensaje: 'Error al actualizar personal' });
  }
};

export const eliminarPersonal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const personal = await Personal.findByPk(id);

    if (!personal) {
      res.status(404).json({ mensaje: 'Personal no encontrado' });
      return;
    }

    // Soft delete: marcar como inactivo
    await personal.update({ activo: false });

    res.json({ mensaje: 'Personal eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar personal:', error);
    res.status(500).json({ mensaje: 'Error al eliminar personal' });
  }
};

export const eliminarPersonalHard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const personal = await Personal.findByPk(id);

    if (!personal) {
      res.status(404).json({ mensaje: 'Personal no encontrado' });
      return;
    }

    // Hard delete: eliminar permanentemente
    await personal.destroy();

    res.json({ mensaje: 'Personal eliminado permanentemente' });
  } catch (error) {
    console.error('Error al eliminar personal permanentemente:', error);
    res.status(500).json({ mensaje: 'Error al eliminar personal permanentemente' });
  }
};
