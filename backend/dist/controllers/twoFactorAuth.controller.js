"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificarLogin2FA = exports.desactivar2FA = exports.verificar2FA = exports.configurar2FA = void 0;
const speakeasy = __importStar(require("speakeasy"));
const QRCode = __importStar(require("qrcode"));
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const refreshToken_service_1 = __importDefault(require("../services/refreshToken.service"));
// Generar token JWT temporal para 2FA
const generarTokenTemporal = (usuario) => {
    const payload = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        temp: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // Expira en 5 minutos
    };
    const secret = process.env.JWT_SECRET || 'secret';
    return jsonwebtoken_1.default.sign(payload, secret, { algorithm: 'HS256' });
};
// Configurar 2FA para un usuario
const configurar2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ mensaje: 'No autorizado' });
            return;
        }
        const user = await User_1.default.findByPk(userId);
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
            secret: secret.base32, // Solo para pruebas
            otpauthUrl
        });
    }
    catch (error) {
        console.error('Error al configurar 2FA:', error);
        res.status(500).json({ mensaje: 'Error al configurar la autenticación de dos factores' });
    }
};
exports.configurar2FA = configurar2FA;
// Verificar código 2FA y activar
const verificar2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ mensaje: 'No autorizado' });
            return;
        }
        const user = await User_1.default.findByPk(userId);
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
        }
        else {
            res.status(400).json({
                mensaje: 'Código inválido o expirado',
                codigo: 'CODIGO_INVALIDO'
            });
        }
    }
    catch (error) {
        console.error('Error al verificar 2FA:', error);
        res.status(500).json({
            mensaje: 'Error al verificar el código',
            codigo: 'ERROR_VERIFICACION'
        });
    }
};
exports.verificar2FA = verificar2FA;
// Desactivar 2FA
const desactivar2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ mensaje: 'No autorizado' });
            return;
        }
        const user = await User_1.default.findByPk(userId);
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
    }
    catch (error) {
        console.error('Error al desactivar 2FA:', error);
        res.status(500).json({
            mensaje: 'Error al desactivar la autenticación de dos factores',
            codigo: 'ERROR_DESACTIVACION'
        });
    }
};
exports.desactivar2FA = desactivar2FA;
// Verificar código 2FA durante el login
const verificarLogin2FA = async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            res.status(400).json({
                mensaje: 'Email y token son requeridos',
                codigo: 'CAMPOS_REQUERIDOS'
            });
            return;
        }
        const user = await User_1.default.findOne({ where: { email } });
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
        const tokens = await refreshToken_service_1.default.generateTokens(user);
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
    }
    catch (error) {
        console.error('Error en verificación 2FA:', error);
        res.status(500).json({
            mensaje: 'Error en la autenticación de dos factores',
            codigo: 'ERROR_SERVIDOR'
        });
    }
};
exports.verificarLogin2FA = verificarLogin2FA;
// Función auxiliar para generar token JWT
const generarToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        rol: user.rol
    };
    const secret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
