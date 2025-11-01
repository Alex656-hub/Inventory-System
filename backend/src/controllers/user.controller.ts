import { Request, Response } from 'express';
import User from '../models/User';

export const obtenerUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['nombre', 'ASC']]
    });

    res.json({ usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios' });
  }
};

export const obtenerUsuarioPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const usuario = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuario' });
  }
};

export const crearUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      res.status(400).json({ mensaje: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    // Verificar que el email no existe
    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) {
      res.status(400).json({ mensaje: 'El email ya está registrado' });
      return;
    }

    const usuario = await User.create({
      nombre,
      email,
      password,
      rol: rol || 'empleado'
    });

    const usuarioSinPassword = await User.findByPk(usuario.id, {
      attributes: { exclude: ['password'] }
    });

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: usuarioSinPassword
    });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El email ya está registrado' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al crear usuario' });
  }
};

export const actualizarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const usuario = await User.findByPk(id);

    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    // Si se actualiza el email, verificar que no existe en otro usuario
    if (datos.email && datos.email !== usuario.email) {
      const usuarioExistente = await User.findOne({ where: { email: datos.email } });
      if (usuarioExistente) {
        res.status(400).json({ mensaje: 'El email ya está registrado' });
        return;
      }
    }

    await usuario.update(datos);

    const usuarioActualizado = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El email ya está registrado' });
      return;
    }
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
};

export const eliminarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const usuario = await User.findByPk(id);

    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    // No permitir eliminar al propio usuario
    if (req.usuario && req.usuario.id === usuario.id) {
      res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta' });
      return;
    }

    // Soft delete: marcar como inactivo
    await usuario.update({ activo: false });

    res.json({ mensaje: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
};

