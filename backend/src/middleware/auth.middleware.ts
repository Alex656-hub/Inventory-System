import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

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
  rol: string;
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
    const secret = process.env.JWT_SECRET || 'secret';

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

// Middleware para verificar tokens temporales (solo para 2FA)
export const verificarToken2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ mensaje: 'Token de autenticación requerido' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as DecodedToken;
    
    // Verificar que sea un token temporal
    if (!('temp' in decoded) || decoded.temp !== true) {
      res.status(401).json({ 
        mensaje: 'Token inválido para verificación 2FA',
        codigo: 'INVALID_2FA_TOKEN'
      });
      return;
    }
    
    // Verificar si el token ha expirado
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      res.status(401).json({ 
        mensaje: 'El código de verificación ha expirado',
        codigo: '2FA_TOKEN_EXPIRED'
      });
      return;
    }
    
    const usuario = await User.findByPk(decoded.id);
    
    if (!usuario || !usuario.activo) {
      res.status(401).json({ mensaje: 'Usuario no válido o inactivo' });
      return;
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en verificación 2FA:', error);
    res.status(401).json({ mensaje: 'Token 2FA inválido o expirado' });
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

