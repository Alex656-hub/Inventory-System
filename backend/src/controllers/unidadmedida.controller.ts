import { Request, Response } from 'express';
import UnidadMedida from '../models/UnidadMedida';
import { Op } from 'sequelize';

export const obtenerUnidades = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, busqueda } = req.query;

    const where: any = {};
    if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    if (busqueda) {
      const busquedaStr = busqueda as string;
      const idNum = parseInt(busquedaStr);
      
      // If search term is purely numeric, only search by ID
      if (!isNaN(idNum) && busquedaStr.trim() === idNum.toString()) {
        where.id = idNum;
      } else {
        // Otherwise, search by name and abbreviation
        where[Op.or] = [
          { nombre: { [Op.iLike]: `%${busquedaStr}%` } },
          { abreviatura: { [Op.iLike]: `%${busquedaStr}%` } }
        ];
      }
    }

    const unidades = await UnidadMedida.findAll({
      where,
      order: [['id', 'ASC']]
    });

    res.json({ unidades });
  } catch (error) {
    console.error('Error al obtener unidades:', error);
    res.status(500).json({ mensaje: 'Error al obtener unidades' });
  }
};

export const obtenerUnidadPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const unidad = await UnidadMedida.findByPk(id);

    if (!unidad) {
      res.status(404).json({ mensaje: 'Unidad de medida no encontrada' });
      return;
    }

    res.json({ unidad });
  } catch (error) {
    console.error('Error al obtener unidad:', error);
    res.status(500).json({ mensaje: 'Error al obtener unidad' });
  }
};

export const crearUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, abreviatura } = req.body;

    if (!nombre || !abreviatura) {
      res.status(400).json({ mensaje: 'El nombre y la abreviatura son obligatorios' });
      return;
    }

    // Verificar si ya existe una unidad con el mismo nombre o abreviatura
    const existingUnidad = await UnidadMedida.findOne({
      where: {
        [Op.or]: [
          { nombre: nombre.trim() },
          { abreviatura: abreviatura.trim() }
        ]
      }
    });

    if (existingUnidad) {
      res.status(400).json({ 
        mensaje: 'Ya existe una unidad con ese nombre o abreviatura' 
      });
      return;
    }

    const unidad = await UnidadMedida.create({
      nombre: nombre.trim(),
      abreviatura: abreviatura.trim(),
      estado: true
    });

    res.status(201).json({ 
      mensaje: 'Unidad de medida creada correctamente',
      unidad 
    });
  } catch (error) {
    console.error('Error al crear unidad:', error);
    res.status(500).json({ mensaje: 'Error al crear unidad' });
  }
};

export const actualizarUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, abreviatura } = req.body;

    const unidad = await UnidadMedida.findByPk(id);

    if (!unidad) {
      res.status(404).json({ mensaje: 'Unidad de medida no encontrada' });
      return;
    }

    if (!nombre || !abreviatura) {
      res.status(400).json({ mensaje: 'El nombre y la abreviatura son obligatorios' });
      return;
    }

    // Verificar si ya existe otra unidad con el mismo nombre o abreviatura
    const existingUnidad = await UnidadMedida.findOne({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: parseInt(id) } },
          {
            [Op.or]: [
              { nombre: nombre.trim() },
              { abreviatura: abreviatura.trim() }
            ]
          }
        ]
      }
    });

    if (existingUnidad) {
      res.status(400).json({ 
        mensaje: 'Ya existe otra unidad con ese nombre o abreviatura' 
      });
      return;
    }

    await unidad.update({
      nombre: nombre.trim(),
      abreviatura: abreviatura.trim()
    });

    res.json({ 
      mensaje: 'Unidad de medida actualizada correctamente',
      unidad 
    });
  } catch (error) {
    console.error('Error al actualizar unidad:', error);
    res.status(500).json({ mensaje: 'Error al actualizar unidad' });
  }
};

export const eliminarUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const unidad = await UnidadMedida.findByPk(id);

    if (!unidad) {
      res.status(404).json({ mensaje: 'Unidad de medida no encontrada' });
      return;
    }

    await unidad.update({ estado: false });

    res.json({ 
      mensaje: 'Unidad de medida desactivada correctamente',
      unidad 
    });
  } catch (error) {
    console.error('Error al desactivar unidad:', error);
    res.status(500).json({ mensaje: 'Error al desactivar unidad' });
  }
};

export const desactivarUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const unidad = await UnidadMedida.findByPk(id);

    if (!unidad) {
      res.status(404).json({ mensaje: 'Unidad de medida no encontrada' });
      return;
    }

    await unidad.update({ estado: false });

    res.json({ 
      mensaje: 'Unidad de medida desactivada correctamente',
      unidad 
    });
  } catch (error) {
    console.error('Error al desactivar unidad:', error);
    res.status(500).json({ mensaje: 'Error al desactivar unidad' });
  }
};

export const activarUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const unidad = await UnidadMedida.findByPk(id);

    if (!unidad) {
      res.status(404).json({ mensaje: 'Unidad de medida no encontrada' });
      return;
    }

    await unidad.update({ estado: true });

    res.json({ 
      mensaje: 'Unidad de medida activada correctamente',
      unidad 
    });
  } catch (error) {
    console.error('Error al activar unidad:', error);
    res.status(500).json({ mensaje: 'Error al activar unidad' });
  }
};

export const eliminarUnidadHard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const unidad = await UnidadMedida.findByPk(id);

    if (!unidad) {
      res.status(404).json({ mensaje: 'Unidad de medida no encontrada' });
      return;
    }

    await unidad.destroy();

    res.json({ 
      mensaje: 'Unidad de medida eliminada permanentemente' 
    });
  } catch (error) {
    console.error('Error al eliminar unidad:', error);
    res.status(500).json({ mensaje: 'Error al eliminar unidad' });
  }
};
