import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { Permisos } from '../models/User';
import { getJwtSecret } from '../config/env';

// Extender interfaz Request para incluir usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: User;
    }
  }
}

export interface JWTPayload {
  id: number;
  email: string;
  usuario: string;
  rol: string;
  permisos: Record<string, boolean>;
  twoFactorEnabled?: boolean;
}

export interface TempJWTPayload extends Omit<JWTPayload, 'twoFactorEnabled'> {
  temp: boolean;
  exp: number;
}

// Tipo unificado para el payload decodificado
type DecodedToken = JWTPayload | TempJWTPayload;

// Middleware para verificar tokens regulares (sin 2FA)
export const verificarToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ mensaje: 'Token de autenticación requerido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret();

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, secret) as DecodedToken;
    
    // Verificar si es un token temporal (2FA)
    if ('temp' in decoded && decoded.temp === true) {
      res.status(401).json({ 
        mensaje: 'Se requiere autenticación de dos factores',
        codigo: '2FA_REQUIRED'
      });
      return;
    }
    
    // Obtener el usuario de la base de datos
    const usuario = await User.findByPk(decoded.id);
    
    if (!usuario) {
      res.status(401).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    if (!usuario.activo) {
      res.status(401).json({ mensaje: 'Usuario inactivo' });
      return;
    }

    // Si el usuario tiene 2FA habilitado, asegurarse de que el token no sea temporal
    if (usuario.twoFactorEnabled && usuario.twoFactorSecret) {
      if ('temp' in decoded) {
        res.status(401).json({ 
          mensaje: 'Se requiere autenticación de dos factores',
          codigo: '2FA_REQUIRED'
        });
        return;
      }
    }

    // Adjuntar el usuario a la solicitud
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en verificación de token:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        mensaje: 'Token expirado', 
        codigo: 'TOKEN_EXPIRED' 
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        mensaje: 'Token inválido', 
        codigo: 'INVALID_TOKEN' 
      });
    } else if (error instanceof Error) {
      res.status(500).json({ 
        mensaje: 'Error al verificar el token',
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        mensaje: 'Error desconocido al verificar el token'
      });
    }
  }
};

export const verificarRol = (rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      console.log('Error: Usuario no autenticado en verificarRol');
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    console.log('Verificando roles:', {
      usuario: req.usuario.email,
      rolActual: req.usuario.rol,
      rolesRequeridos: rolesPermitidos
    });

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      console.log('Acceso denegado. Rol no permitido');
      return res.status(403).json({ 
        mensaje: 'No tienes permisos para realizar esta acción',
        detalle: {
          rolActual: req.usuario.rol,
          rolesRequeridos: rolesPermitidos
        }
      });
    }

    console.log('Acceso permitido para el rol:', req.usuario.rol);
    next();
  };
};

export const soloGerente = verificarRol(['gerente']);
export const gerenteOEmpleado = verificarRol(['gerente', 'empleado']);

// Middleware para verificar permisos específicos del módulo
export const verificarPermiso = (permiso: keyof Permisos) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    // Gerentes siempre pasan (tienen todos los permisos)
    if (req.usuario.rol === 'gerente') {
      return next();
    }

    const permisos = req.usuario.permisos;
    
    if (!permisos || !permisos[permiso]) {
      return res.status(403).json({
        mensaje: 'No tienes permiso para acceder a este módulo',
        detalle: {
          permisoRequerido: permiso
        }
      });
    }

    next();
  };
};

