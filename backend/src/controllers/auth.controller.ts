import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { JWTPayload, TempJWTPayload } from '../middleware/auth.middleware';
import RefreshTokenService, { TokenResponse } from '../services/refreshToken.service';
import { getJwtExpiresIn, getJwtSecret } from '../config/env';

// Función para generar token JWT normal
const generarToken = (usuario: User): string => {
  const payload: JWTPayload = {
    id: usuario.id,
    email: usuario.email,
    usuario: usuario.usuario,
    rol: usuario.rol,
    permisos: usuario.permisos as unknown as Record<string, boolean>,
    twoFactorEnabled: usuario.twoFactorEnabled || false
  };

  const secret: string = getJwtSecret();
  const expiresIn: string = getJwtExpiresIn('7d');

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn
  } as jwt.SignOptions);
};

// Función para generar token temporal para 2FA
export const generarTokenTemporal = (usuario: User): string => {
  const payload: TempJWTPayload = {
    id: usuario.id,
    email: usuario.email,
    usuario: usuario.usuario,
    rol: usuario.rol,
    permisos: usuario.permisos as unknown as Record<string, boolean>,
    temp: true,
    exp: Math.floor(Date.now() / 1000) + (5 * 60)
  };

  const secret: string = getJwtSecret();
  
  return jwt.sign(payload, secret);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, usuario: usuarioInput } = req.body;

    const loginEmail = usuarioInput ? `${usuarioInput}@credisa.com` : email;

    if (!loginEmail || !password) {
      res.status(400).json({ mensaje: 'Usuario/Email y contraseña son requeridos' });
      return;
    }

    // 1. Buscar usuario
    const usuario = await User.findOne({ 
      where: { email: loginEmail },
      attributes: ['id', 'nombre', 'usuario', 'email', 'password', 'rol', 'activo', 'permisos', 'twoFactorEnabled', 'twoFactorSecret']
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
          usuario: usuario.usuario,
          email: usuario.email
        }
      });
    } else {
      // 5. Si no requiere 2FA, generar ambos tokens
      const tokens = await RefreshTokenService.generateTokens(usuario);

      res.json({
        mensaje: 'Inicio de sesión exitoso',
        requiere2FA: false,
        ...tokens,
        usuario: {
          id: usuario.id,
          usuario: usuario.usuario,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          permisos: usuario.permisos,
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
      usuario: usuarioCompleto.usuario,
      nombre: usuarioCompleto.nombre,
      email: usuarioCompleto.email,
      rol: usuarioCompleto.rol,
      permisos: usuarioCompleto.permisos,
      twoFactorEnabled: usuarioCompleto.twoFactorEnabled || false
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ mensaje: 'Error al obtener perfil' });
  }
};

// Endpoint para refrescar el access token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: refreshTokenString } = req.body;

    if (!refreshTokenString) {
      res.status(400).json({ mensaje: 'Refresh token es requerido' });
      return;
    }

    const tokens = await RefreshTokenService.refreshAccessToken(refreshTokenString);

    if (!tokens) {
      res.status(401).json({ mensaje: 'Refresh token inválido o expirado' });
      return;
    }

    res.json(tokens);
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({ mensaje: 'Error al refrescar token' });
  }
};

// Endpoint para logout (revocar refresh token)
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: refreshTokenString } = req.body;

    if (!refreshTokenString) {
      res.status(400).json({ mensaje: 'Refresh token es requerido' });
      return;
    }

    const revoked = await RefreshTokenService.revokeRefreshToken(refreshTokenString);

    if (!revoked) {
      res.status(404).json({ mensaje: 'Refresh token no encontrado' });
      return;
    }

    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ mensaje: 'Error al cerrar sesión' });
  }
};

// Endpoint para logout en todos los dispositivos
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = req.usuario;

    if (!usuario) {
      res.status(401).json({ mensaje: 'Usuario no autenticado' });
      return;
    }

    await RefreshTokenService.revokeAllUserTokens(usuario.id);

    res.json({ mensaje: 'Sesiones cerradas en todos los dispositivos' });
  } catch (error) {
    console.error('Error al cerrar todas las sesiones:', error);
    res.status(500).json({ mensaje: 'Error al cerrar todas las sesiones' });
  }
};

// Endpoint para limpiar tokens expirados (para mantenimiento)
export const cleanupTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    await RefreshTokenService.cleanupExpiredTokens();
    res.json({ mensaje: 'Tokens expirados limpiados exitosamente' });
  } catch (error) {
    console.error('Error al limpiar tokens:', error);
    res.status(500).json({ mensaje: 'Error al limpiar tokens expirados' });
  }
};

