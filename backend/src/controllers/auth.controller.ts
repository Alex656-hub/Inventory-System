import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JWTPayload } from '../middleware/auth.middleware';

const generarToken = (usuario: User): string => {
  const payload: JWTPayload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol
  };

  const secret: string = process.env.JWT_SECRET || 'secret';
  const expiresIn: string = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn
  } as jwt.SignOptions);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ mensaje: 'Email y contraseña son requeridos' });
      return;
    }

    const usuario = await User.findOne({ where: { email } });

    if (!usuario) {
      res.status(401).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    if (!usuario.activo) {
      res.status(401).json({ mensaje: 'Usuario inactivo' });
      return;
    }

    const esPasswordValido = await usuario.verificarPassword(password);

    if (!esPasswordValido) {
      res.status(401).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    const token = generarToken(usuario);

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
};

export const obtenerPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.usuario) {
      res.status(401).json({ mensaje: 'Usuario no autenticado' });
      return;
    }

    res.json({
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      email: req.usuario.email,
      rol: req.usuario.rol
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ mensaje: 'Error al obtener perfil' });
  }
};

