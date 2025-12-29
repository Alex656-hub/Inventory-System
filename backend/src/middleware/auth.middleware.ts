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
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ mensaje: 'Token de autenticación requerido' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as DecodedToken;
    
    // Verificar si es un token temporal (2FA)
    if ('temp' in decoded && decoded.temp === true) {
      res.status(401).json({ 
        mensaje: 'Se requiere autenticación de dos factores',
        codigo: '2FA_REQUIRED'
      });
      return;
    }
    
    const usuario = await User.findByPk(decoded.id);
    
    if (!usuario || !usuario.activo) {
      res.status(401).json({ mensaje: 'Usuario no válido o inactivo' });
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

    req.usuario = usuario;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
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

export const verificarRol = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ mensaje: 'Usuario no autenticado' });
      return;
    }

    if (!roles.includes(req.usuario.rol)) {
      res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
      return;
    }

    next();
  };
};

export const soloGerente = verificarRol(['gerente']);
export const gerenteOEmpleado = verificarRol(['gerente', 'empleado']);

