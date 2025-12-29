import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JWTPayload, TempJWTPayload } from '../middleware/auth.middleware';

// Función para generar token JWT normal
const generarToken = (usuario: User): string => {
  const payload: JWTPayload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    twoFactorEnabled: usuario.twoFactorEnabled || false
  };

  const secret: string = process.env.JWT_SECRET || 'secret';
  const expiresIn: string = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn
  } as jwt.SignOptions);
};

// Función para generar token temporal para 2FA
export const generarTokenTemporal = (usuario: User): string => {
  const payload: TempJWTPayload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    temp: true,
    exp: Math.floor(Date.now() / 1000) + (5 * 60) // Expira en 5 minutos
  };

  const secret: string = process.env.JWT_SECRET || 'secret';
  
  return jwt.sign(payload, secret);
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

    // Verificar si el usuario tiene 2FA habilitado
    if (usuario.twoFactorEnabled && usuario.twoFactorSecret) {
      // Generar token temporal para 2FA
      const tempToken = generarTokenTemporal(usuario);
      
      res.status(200).json({
        mensaje: 'Se requiere autenticación de dos factores',
        requiere2FA: true,
        token: tempToken,
        usuario: {
          id: usuario.id,
          email: usuario.email
        }
      });
    } else {
      // Si no tiene 2FA habilitado, devolver token normal
      const token = generarToken(usuario);

      res.json({
        mensaje: 'Inicio de sesión exitoso',
        requiere2FA: false,
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          twoFactorEnabled: false
        }
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
};

export const obtenerPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    // El middleware de autenticación ya verificó el token y adjuntó el usuario
    const usuario = req.usuario;

    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    // Obtener el usuario completo de la base de datos para asegurar que tenemos los datos más recientes
    const usuarioCompleto = await User.findByPk(usuario.id);
    
    if (!usuarioCompleto) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json({
      id: usuarioCompleto.id,
      nombre: usuarioCompleto.nombre,
      email: usuarioCompleto.email,
      rol: usuarioCompleto.rol,
      twoFactorEnabled: usuarioCompleto.twoFactorEnabled || false
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ mensaje: 'Error al obtener perfil' });
  }
};

