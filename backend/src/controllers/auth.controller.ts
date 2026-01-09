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

    // 1. Buscar usuario incluyendo el rol
    const usuario = await User.findOne({ 
      where: { email },
      attributes: ['id', 'nombre', 'email', 'password', 'rol', 'activo', 'twoFactorEnabled', 'twoFactorSecret']
    });

    if (!usuario) {
      console.log(`Intento de inicio de sesión fallido para el email: ${email}`);
      res.status(401).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    // 2. Verificar si el usuario está activo
    if (!usuario.activo) {
      console.log(`Intento de inicio de sesión para usuario inactivo: ${email}`);
      res.status(401).json({ mensaje: 'Usuario inactivo' });
      return;
    }

    // 3. Verificar contraseña
    const esPasswordValido = await usuario.verificarPassword(password);
    if (!esPasswordValido) {
      console.log(`Contraseña incorrecta para el usuario: ${email}`);
      res.status(401).json({ mensaje: 'Credenciales inválidas' });
      return;
    }

    console.log('Inicio de sesión exitoso para:', {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      twoFactorEnabled: usuario.twoFactorEnabled
    });

    // 4. Manejar 2FA si está habilitado
    if (usuario.twoFactorEnabled && usuario.twoFactorSecret) {
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
      // 5. Si no requiere 2FA, devolver token normal
      const token = generarToken(usuario);

      res.json({
        mensaje: 'Inicio de sesión exitoso',
        requiere2FA: false,
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,  // Asegurarse de incluir el rol en la respuesta
          twoFactorEnabled: false
        }
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      mensaje: 'Error al iniciar sesión',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
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

