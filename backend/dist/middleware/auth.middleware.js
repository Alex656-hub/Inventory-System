"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerenteOEmpleado = exports.soloGerente = exports.verificarRol = exports.verificarToken2FA = exports.verificarToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// Middleware para verificar tokens regulares (sin 2FA)
const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ mensaje: 'Token de autenticación requerido' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'secret';
        // Verificar y decodificar el token
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Verificar si es un token temporal (2FA)
        if ('temp' in decoded && decoded.temp === true) {
            res.status(401).json({
                mensaje: 'Se requiere autenticación de dos factores',
                codigo: '2FA_REQUIRED'
            });
            return;
        }
        // Obtener el usuario de la base de datos
        const usuario = await User_1.default.findByPk(decoded.id);
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
    }
    catch (error) {
        console.error('Error en verificación de token:', error);
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                mensaje: 'Token expirado',
                codigo: 'TOKEN_EXPIRED'
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                mensaje: 'Token inválido',
                codigo: 'INVALID_TOKEN'
            });
        }
        else if (error instanceof Error) {
            res.status(500).json({
                mensaje: 'Error al verificar el token',
                error: error.message
            });
        }
        else {
            res.status(500).json({
                mensaje: 'Error desconocido al verificar el token'
            });
        }
    }
};
exports.verificarToken = verificarToken;
// Middleware para verificar tokens temporales (solo para 2FA)
const verificarToken2FA = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ mensaje: 'Token de autenticación requerido' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
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
        const usuario = await User_1.default.findByPk(decoded.id);
        if (!usuario || !usuario.activo) {
            res.status(401).json({ mensaje: 'Usuario no válido o inactivo' });
            return;
        }
        req.usuario = usuario;
        next();
    }
    catch (error) {
        console.error('Error en verificación 2FA:', error);
        res.status(401).json({ mensaje: 'Token 2FA inválido o expirado' });
    }
};
exports.verificarToken2FA = verificarToken2FA;
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
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
exports.verificarRol = verificarRol;
exports.soloGerente = (0, exports.verificarRol)(['gerente']);
exports.gerenteOEmpleado = (0, exports.verificarRol)(['gerente', 'empleado']);
