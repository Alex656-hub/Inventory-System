import { Request, Response } from 'express';
import User, { PERMISOS_DEFAULT, Permisos } from '../models/User';

const EXCLUDED_FIELDS = { exclude: ['password', 'twoFactorSecret', 'backupCodes'] };

function permisosGerente(): Permisos {
  const p: any = {};
  for (const key of Object.keys(PERMISOS_DEFAULT)) {
    p[key] = true;
  }
  return p as Permisos;
}

export const obtenerUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await User.findAll({
      attributes: EXCLUDED_FIELDS,
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
      attributes: EXCLUDED_FIELDS
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
    const { usuario, nombre, password, rol } = req.body;

    if (!usuario || !nombre || !password) {
      res.status(400).json({ mensaje: 'Usuario, nombre y contraseña son requeridos' });
      return;
    }

    const email = `${usuario}@credisa.com`;

    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) {
      res.status(400).json({ mensaje: 'El usuario ya está registrado' });
      return;
    }

    const rolFinal = rol || 'empleado';
    const permisos = req.body.permisos
      ? req.body.permisos
      : rolFinal === 'gerente'
        ? permisosGerente()
        : { ...PERMISOS_DEFAULT };

    const nuevoUsuario = await User.create({
      usuario,
      nombre,
      email,
      password,
      rol: rolFinal,
      permisos
    });

    const usuarioCreado = await User.findByPk(nuevoUsuario.id, {
      attributes: EXCLUDED_FIELDS
    });

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: usuarioCreado
    });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El usuario ya está registrado' });
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

    if (datos.usuario) {
      const nuevoEmail = `${datos.usuario}@credisa.com`;
      const existente = await User.findOne({ where: { email: nuevoEmail } });
      if (existente && existente.id !== usuario.id) {
        res.status(400).json({ mensaje: 'El usuario ya está registrado' });
        return;
      }
      datos.email = nuevoEmail;
    }

    if (datos.rol && !datos.permisos) {
      datos.permisos = datos.rol === 'gerente' ? permisosGerente() : { ...PERMISOS_DEFAULT };
    }

    await usuario.update(datos);

    const usuarioActualizado = await User.findByPk(id, {
      attributes: EXCLUDED_FIELDS
    });

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado
    });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ mensaje: 'El usuario ya está registrado' });
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

    if (req.usuario && req.usuario.id === usuario.id) {
      res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta' });
      return;
    }

    await usuario.update({ activo: false });

    res.json({ mensaje: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
};

