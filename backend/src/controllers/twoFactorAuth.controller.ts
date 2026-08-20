// backend/src/controllers/twoFactorAuth.controller.ts
import { Request, Response } from 'express';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import User from '../models/User';
import jwt, { SignOptions } from 'jsonwebtoken';
import RefreshTokenService from '../services/refreshToken.service';
import { getJwtExpiresIn, getJwtSecret } from '../config/env';

// Extender la interfaz Request para incluir la propiedad user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        rol: string;
        twoFactorEnabled?: boolean;
      };
    }
  }
}

// Interfaz para el payload del JWT temporal
interface JwtPayload {
  id: number;
  email: string;
  rol: string;
  temp?: boolean;
  exp?: number;
}

// Generar token JWT temporal para 2FA
const generarTokenTemporal = (usuario: User): string => {
  const payload: JwtPayload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    temp: true,
    exp: Math.floor(Date.now() / 1000) + (5 * 60) // Expira en 5 minutos
  };

  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { algorithm: 'HS256' } as SignOptions);
};

// Configurar 2FA para un usuario
export const configurar2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ mensaje: 'No autorizado' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    // Generar secreto para 2FA
    const secret = speakeasy.generateSecret({
      name: `Sistema de Inventario (${user.email})`,
      length: 20
    });

    // Generar URL para el código QR
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `Sistema de Inventario:${user.email}`,
      issuer: 'Sistema de Inventario',
      encoding: 'base32'
    });

    // Generar códigos de respaldo
    const backupCodes = user.generarCodigosRespaldo();
    
    // Guardar el secreto (pero no activar 2FA hasta la verificación)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generar QR como data URL
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    res.json({
      mensaje: 'Escanea el código QR con tu aplicación de autenticación',
      qrCode,
      backupCodes,
      otpauthUrl
    });

  } catch (error) {
    console.error('Error al configurar 2FA:', error);
    res.status(500).json({ mensaje: 'Error al configurar la autenticación de dos factores' });
  }
};

// Verificar código 2FA y activar
export const verificar2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ mensaje: 'No autorizado' });
      return;
    }

    const user = await User.findByPk(userId);
    
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ 
        mensaje: 'Configuración 2FA no encontrada',
        codigo: 'CONFIGURACION_NO_ENCONTRADA'
      });
      return;
    }

    const isVerified = await user.verificarCodigo2FA(token);

    if (isVerified) {
      user.twoFactorEnabled = true;
      await user.save();
      res.json({ 
        mensaje: 'Autenticación de dos factores activada correctamente',
        backupCodes: user.backupCodes ? JSON.parse(user.backupCodes) : []
      });
    } else {
      res.status(400).json({ 
        mensaje: 'Código inválido o expirado',
        codigo: 'CODIGO_INVALIDO'
      });
    }
  } catch (error) {
    console.error('Error al verificar 2FA:', error);
    res.status(500).json({ 
      mensaje: 'Error al verificar el código',
      codigo: 'ERROR_VERIFICACION'
    });
  }
};

// Desactivar 2FA
export const desactivar2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ mensaje: 'No autorizado' });
      return;
    }

    const user = await User.findByPk(userId);
    
    if (!user) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = null;
    await user.save();

    res.json({ 
      mensaje: 'Autenticación de dos factores desactivada',
      twoFactorEnabled: false
    });
  } catch (error) {
    console.error('Error al desactivar 2FA:', error);
    res.status(500).json({ 
      mensaje: 'Error al desactivar la autenticación de dos factores',
      codigo: 'ERROR_DESACTIVACION'
    });
  }
};

// Verificar código 2FA durante el login
export const verificarLogin2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      res.status(400).json({ 
        mensaje: 'Email y token son requeridos',
        codigo: 'CAMPOS_REQUERIDOS'
      });
      return;
    }

    const user = await User.findOne({ where: { email } });
    
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ 
        mensaje: 'Autenticación de dos factores no configurada',
        codigo: '2FA_NO_CONFIGURADO'
      });
      return;
    }

    // Verificar el token 2FA
    let isTokenValid = await user.verificarCodigo2FA(token);
    
    // Si el token no es válido, verificar si es un código de respaldo
    if (!isTokenValid && user.backupCodes) {
      isTokenValid = user.verificarCodigoRespaldo(token);
      if (isTokenValid) {
        await user.save(); // Guardar cambios en los códigos de respaldo
      }
    }

    if (!isTokenValid) {
      res.status(400).json({ 
        mensaje: 'Código 2FA inválido',
        codigo: 'CODIGO_INVALIDO'
      });
      return;
    }

    // Generar ambos tokens (access y refresh)
    const tokens = await RefreshTokenService.generateTokens(user);

    res.json({
      mensaje: 'Autenticación exitosa',
      ...tokens, // accessToken, refreshToken, expiresIn, tokenType
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('Error en verificación 2FA:', error);
    res.status(500).json({ 
      mensaje: 'Error en la autenticación de dos factores',
      codigo: 'ERROR_SERVIDOR'
    });
  }
};

// Función auxiliar para generar token JWT
const generarToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    rol: user.rol
  };

  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn('7d');

  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};