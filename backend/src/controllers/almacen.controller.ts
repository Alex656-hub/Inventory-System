import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Almacen from '../models/Almacen';
import Sede from '../models/Sede';
import { Op } from 'sequelize';

// Obtener todos los almacenes con paginación y filtros
export const obtenerAlmacenes = async (req: Request, res: Response) => {
  try {
    const {
      pagina = 1,
      limite = 10,
      busqueda = '',
      tipo = '',
      estado = '',
      sede_id = '',
      orden = 'createdAt',
      direccion = 'DESC'
    } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    // Filtros
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { codigo: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (estado) {
      where.estado = estado;
    }

    if (sede_id) {
      where.sede_id = sede_id;
    }

    const { count, rows: almacenes } = await Almacen.findAndCountAll({
      where,
      limit: Number(limite),
      offset,
      order: [[orden as string, direccion as string]],
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'tipo', 'direccion']
        }
      ]
    });

    res.json({
      almacenes,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener almacenes:', error);
    res.status(500).json({ mensaje: 'Error al obtener los almacenes' });
  }
};

// Obtener un almacén por ID
export const obtenerAlmacenPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const almacen = await Almacen.findByPk(id, {
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'tipo', 'direccion', 'telefono', 'responsable']
        }
      ]
    });

    if (!almacen) {
      return res.status(404).json({ mensaje: 'Almacén no encontrado' });
    }

    res.json(almacen);
  } catch (error) {
    console.error('Error al obtener almacén:', error);
    res.status(500).json({ mensaje: 'Error al obtener el almacén' });
  }
};

// Crear un nuevo almacén
export const crearAlmacen = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { nombre, codigo, sede_id, tipo, capacidad, unidad_capacidad, descripcion } = req.body;

    // Verificar si la sede existe
    const sede = await Sede.findByPk(sede_id);
    if (!sede) {
      return res.status(400).json({ mensaje: 'La sede especificada no existe' });
    }

    // Verificar si ya existe un almacén con el mismo código
    const almacenExistente = await Almacen.findOne({ where: { codigo: codigo.trim() } });
    if (almacenExistente) {
      return res.status(400).json({ mensaje: 'Ya existe un almacén con ese código' });
    }

    const nuevoAlmacen = await Almacen.create({
      nombre: nombre.trim(),
      codigo: codigo.trim(),
      sede_id,
      tipo,
      capacidad: capacidad ? Number(capacidad) : undefined,
      unidad_capacidad,
      descripcion: descripcion?.trim()
    });

    // Obtener el almacén creado con la relación de sede
    const almacenConSede = await Almacen.findByPk(nuevoAlmacen.id, {
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'tipo']
        }
      ]
    });

    res.status(201).json({
      mensaje: 'Almacén creado exitosamente',
      almacen: almacenConSede
    });
  } catch (error: any) {
    console.error('Error al crear almacén:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear el almacén',
      error: error.message 
    });
  }
};

// Actualizar un almacén
export const actualizarAlmacen = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { id } = req.params;
    const { nombre, codigo, sede_id, tipo, capacidad, unidad_capacidad, descripcion, estado } = req.body;

    const almacen = await Almacen.findByPk(id);
    if (!almacen) {
      return res.status(404).json({ mensaje: 'Almacén no encontrado' });
    }

    // Verificar si la sede existe (si se proporciona)
    if (sede_id && sede_id !== almacen.sede_id) {
      const sede = await Sede.findByPk(sede_id);
      if (!sede) {
        return res.status(400).json({ mensaje: 'La sede especificada no existe' });
      }
    }

    // Verificar si ya existe otro almacén con el mismo código
    if (codigo && codigo !== almacen.codigo) {
      const almacenExistente = await Almacen.findOne({ 
        where: { 
          codigo: codigo.trim(),
          id: { [Op.ne]: id }
        } 
      });
      if (almacenExistente) {
        return res.status(400).json({ mensaje: 'Ya existe otro almacén con ese código' });
      }
    }

    await almacen.update({
      nombre: nombre?.trim() || almacen.nombre,
      codigo: codigo?.trim() || almacen.codigo,
      sede_id: sede_id || almacen.sede_id,
      tipo: tipo || almacen.tipo,
      capacidad: capacidad !== undefined ? (capacidad ? Number(capacidad) : undefined) : almacen.capacidad,
      unidad_capacidad: unidad_capacidad || almacen.unidad_capacidad,
      descripcion: descripcion?.trim() || almacen.descripcion,
      estado: estado || almacen.estado
    });

    // Obtener el almacén actualizado con la relación de sede
    const almacenActualizado = await Almacen.findByPk(id, {
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'tipo']
        }
      ]
    });

    res.json({
      mensaje: 'Almacén actualizado exitosamente',
      almacen: almacenActualizado
    });
  } catch (error: any) {
    console.error('Error al actualizar almacén:', error);
    res.status(500).json({ 
      mensaje: 'Error al actualizar el almacén',
      error: error.message 
    });
  }
};

// Eliminar un almacén (cambio de estado a inactivo)
export const eliminarAlmacen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const almacen = await Almacen.findByPk(id);
    if (!almacen) {
      return res.status(404).json({ mensaje: 'Almacén no encontrado' });
    }

    // Cambiar estado a inactivo en lugar de eliminar físicamente
    await almacen.update({ estado: 'inactivo' });

    res.json({
      mensaje: 'Almacén eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar almacén:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el almacén' });
  }
};

// Activar/Desactivar almacén
export const toggleEstadoAlmacen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const almacen = await Almacen.findByPk(id);
    if (!almacen) {
      return res.status(404).json({ mensaje: 'Almacén no encontrado' });
    }

    const nuevoEstado = almacen.estado === 'activo' ? 'inactivo' : 'activo';
    await almacen.update({ estado: nuevoEstado });

    res.json({
      mensaje: `Almacén ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
      estado: nuevoEstado
    });
  } catch (error) {
    console.error('Error al cambiar estado de almacén:', error);
    res.status(500).json({ mensaje: 'Error al cambiar el estado del almacén' });
  }
};

// Obtener almacenes para select (solo activos)
export const obtenerAlmacenesSelect = async (req: Request, res: Response) => {
  try {
    const { sede_id } = req.query;

    const where: any = { estado: 'activo' };
    if (sede_id) {
      where.sede_id = sede_id;
    }

    const almacenes = await Almacen.findAll({
      where,
      attributes: ['id', 'nombre', 'codigo', 'tipo'],
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre']
        }
      ],
      order: [['nombre', 'ASC']]
    });

    res.json(almacenes);
  } catch (error) {
    console.error('Error al obtener almacenes para select:', error);
    res.status(500).json({ mensaje: 'Error al obtener los almacenes' });
  }
};

// Obtener almacenes por sede
export const obtenerAlmacenesPorSede = async (req: Request, res: Response) => {
  try {
    const { sede_id } = req.params;

    // Verificar si la sede existe
    const sede = await Sede.findByPk(sede_id);
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    const almacenes = await Almacen.findAll({
      where: { 
        sede_id,
        estado: 'activo'
      },
      attributes: ['id', 'nombre', 'codigo', 'tipo', 'capacidad', 'unidad_capacidad'],
      order: [['nombre', 'ASC']]
    });

    res.json({
      sede: {
        id: sede.id,
        nombre: sede.nombre,
        tipo: sede.tipo,
        direccion: sede.direccion
      },
      almacenes
    });
  } catch (error) {
    console.error('Error al obtener almacenes por sede:', error);
    res.status(500).json({ mensaje: 'Error al obtener los almacenes de la sede' });
  }
};

// Obtener estadísticas de almacenes
export const obtenerEstadisticasAlmacenes = async (req: Request, res: Response) => {
  try {
    const totalAlmacenes = await Almacen.count();
    const almacenesActivos = await Almacen.count({ where: { estado: 'activo' } });
    const almacenesInactivos = await Almacen.count({ where: { estado: 'inactivo' } });

    const almacenesPorTipo = await Almacen.findAll({
      attributes: [
        'tipo',
        [Almacen.sequelize!.fn('COUNT', Almacen.sequelize!.col('id')), 'cantidad']
      ],
      group: ['tipo'],
      raw: true
    });

    const almacenesPorSede = await Almacen.findAll({
      attributes: [
        'sede_id',
        [Almacen.sequelize!.fn('COUNT', Almacen.sequelize!.col('id')), 'cantidad']
      ],
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['nombre']
        }
      ],
      group: ['sede_id', 'sede.id', 'sede.nombre'],
      raw: true
    });

    res.json({
      totalAlmacenes,
      almacenesActivos,
      almacenesInactivos,
      almacenesPorTipo,
      almacenesPorSede
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de almacenes:', error);
    res.status(500).json({ mensaje: 'Error al obtener las estadísticas' });
  }
};
