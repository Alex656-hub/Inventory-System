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
}

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JWTPayload;
    
    const usuario = await User.findByPk(decoded.id);
    
    if (!usuario || !usuario.activo) {
      res.status(401).json({ mensaje: 'Usuario no válido o inactivo' });
      return;
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
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

