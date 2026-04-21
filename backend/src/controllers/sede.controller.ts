import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Sede from '../models/Sede';
import Almacen from '../models/Almacen';
import { Op } from 'sequelize';

// Obtener todas las sedes con paginación y filtros
export const obtenerSedes = async (req: Request, res: Response) => {
  try {
    const {
      pagina = 1,
      limite = 10,
      busqueda = '',
      tipo = '',
      estado = '',
      orden = 'createdAt',
      direccion = 'DESC'
    } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    // Filtros
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { direccion: { [Op.iLike]: `%${busqueda}%` } },
        { responsable: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (estado) {
      where.estado = estado;
    }

    const { count, rows: sedes } = await Sede.findAndCountAll({
      where,
      limit: Number(limite),
      offset,
      order: [[orden as string, direccion as string]],
      include: [
        {
          model: Almacen,
          as: 'almacenes',
          attributes: ['id', 'nombre', 'codigo', 'estado']
        }
      ]
    });

    res.json({
      sedes,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener sedes:', error);
    res.status(500).json({ mensaje: 'Error al obtener las sedes' });
  }
};

// Obtener una sede por ID
export const obtenerSedePorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sede = await Sede.findByPk(id, {
      include: [
        {
          model: Almacen,
          as: 'almacenes',
          attributes: ['id', 'nombre', 'codigo', 'tipo', 'capacidad', 'unidad_capacidad', 'estado']
        }
      ]
    });

    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    res.json(sede);
  } catch (error) {
    console.error('Error al obtener sede:', error);
    res.status(500).json({ mensaje: 'Error al obtener la sede' });
  }
};

// Crear una nueva sede
export const crearSede = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { nombre, tipo, direccion, telefono, email, responsable } = req.body;

    // Verificar si ya existe una sede con el mismo nombre
    const sedeExistente = await Sede.findOne({ where: { nombre: nombre.trim() } });
    if (sedeExistente) {
      return res.status(400).json({ mensaje: 'Ya existe una sede con ese nombre' });
    }

    const nuevaSede = await Sede.create({
      nombre: nombre.trim(),
      tipo,
      direccion: direccion.trim(),
      telefono: telefono?.trim(),
      email: email?.trim(),
      responsable: responsable?.trim()
    });

    res.status(201).json({
      mensaje: 'Sede creada exitosamente',
      sede: nuevaSede
    });
  } catch (error: any) {
    console.error('Error al crear sede:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear la sede',
      error: error.message 
    });
  }
};

// Actualizar una sede
export const actualizarSede = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { id } = req.params;
    const { nombre, tipo, direccion, telefono, email, responsable, estado } = req.body;

    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    // Verificar si ya existe otra sede con el mismo nombre
    if (nombre && nombre !== sede.nombre) {
      const sedeExistente = await Sede.findOne({ 
        where: { 
          nombre: nombre.trim(),
          id: { [Op.ne]: id }
        } 
      });
      if (sedeExistente) {
        return res.status(400).json({ mensaje: 'Ya existe otra sede con ese nombre' });
      }
    }

    await sede.update({
      nombre: nombre?.trim() || sede.nombre,
      tipo: tipo || sede.tipo,
      direccion: direccion?.trim() || sede.direccion,
      telefono: telefono?.trim() || sede.telefono,
      email: email?.trim() || sede.email,
      responsable: responsable?.trim() || sede.responsable,
      estado: estado || sede.estado
    });

    res.json({
      mensaje: 'Sede actualizada exitosamente',
      sede
    });
  } catch (error: any) {
    console.error('Error al actualizar sede:', error);
    res.status(500).json({ 
      mensaje: 'Error al actualizar la sede',
      error: error.message 
    });
  }
};

// Eliminar una sede (cambio de estado a inactivo)
export const eliminarSede = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    // Verificar si tiene almacenes asociados
    const almacenesAsociados = await Almacen.count({ where: { sede_id: id } });
    if (almacenesAsociados > 0) {
      return res.status(400).json({ 
        mensaje: 'No se puede eliminar la sede porque tiene almacenes asociados' 
      });
    }

    // Cambiar estado a inactivo en lugar de eliminar físicamente
    await sede.update({ estado: 'inactivo' });

    res.json({
      mensaje: 'Sede eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sede:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la sede' });
  }
};

// Activar/Desactivar sede
export const toggleEstadoSede = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    const nuevoEstado = sede.estado === 'activo' ? 'inactivo' : 'activo';
    await sede.update({ estado: nuevoEstado });

    res.json({
      mensaje: `Sede ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'} exitosamente`,
      estado: nuevoEstado
    });
  } catch (error) {
    console.error('Error al cambiar estado de sede:', error);
    res.status(500).json({ mensaje: 'Error al cambiar el estado de la sede' });
  }
};

// Obtener sedes para select (solo activas)
export const obtenerSedesSelect = async (req: Request, res: Response) => {
  try {
    const sedes = await Sede.findAll({
      where: { estado: 'activo' },
      attributes: ['id', 'nombre', 'tipo'],
      order: [['nombre', 'ASC']]
    });

    res.json(sedes);
  } catch (error) {
    console.error('Error al obtener sedes para select:', error);
    res.status(500).json({ mensaje: 'Error al obtener las sedes' });
  }
};

// Obtener estadísticas de sedes
export const obtenerEstadisticasSedes = async (req: Request, res: Response) => {
  try {
    const totalSedes = await Sede.count();
    const sedesActivas = await Sede.count({ where: { estado: 'activo' } });
    const sedesInactivas = await Sede.count({ where: { estado: 'inactivo' } });

    const sedesPorTipo = await Sede.findAll({
      attributes: [
        'tipo',
        [Sede.sequelize!.fn('COUNT', Sede.sequelize!.col('id')), 'cantidad']
      ],
      group: ['tipo'],
      raw: true
    });

    res.json({
      totalSedes,
      sedesActivas,
      sedesInactivas,
      sedesPorTipo
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de sedes:', error);
    res.status(500).json({ mensaje: 'Error al obtener las estadísticas' });
  }
};
