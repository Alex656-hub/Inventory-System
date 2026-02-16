"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTokens = exports.logoutAll = exports.logout = exports.refreshToken = exports.obtenerPerfil = exports.login = exports.generarTokenTemporal = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const refreshToken_service_1 = __importDefault(require("../services/refreshToken.service"));
// Función para generar token JWT normal
const generarToken = (usuario) => {
    const payload = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        twoFactorEnabled: usuario.twoFactorEnabled || false
    };
    const secret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    return jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: expiresIn
    });
};
// Función para generar token temporal para 2FA
const generarTokenTemporal = (usuario) => {
    const payload = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        temp: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // Expira en 5 minutos
    };
    const secret = process.env.JWT_SECRET || 'secret';
    return jsonwebtoken_1.default.sign(payload, secret);
};
exports.generarTokenTemporal = generarTokenTemporal;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ mensaje: 'Email y contraseña son requeridos' });
            return;
        }
        // 1. Buscar usuario incluyendo el rol
        const usuario = await User_1.default.findOne({
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
            const tempToken = (0, exports.generarTokenTemporal)(usuario);
            res.status(200).json({
                mensaje: 'Se requiere autenticación de dos factores',
                requiere2FA: true,
                token: tempToken,
                usuario: {
                    id: usuario.id,
                    email: usuario.email
                }
            });
        }
        else {
            // 5. Si no requiere 2FA, generar ambos tokens
            const tokens = await refreshToken_service_1.default.generateTokens(usuario);
            res.json({
                mensaje: 'Inicio de sesión exitoso',
                requiere2FA: false,
                ...tokens, // accessToken, refreshToken, expiresIn, tokenType
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol,
                    twoFactorEnabled: false
                }
            });
        }
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            mensaje: 'Error al iniciar sesión',
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.login = login;
const obtenerPerfil = async (req, res) => {
    try {
        // El middleware de autenticación ya verificó el token y adjuntó el usuario
        const usuario = req.usuario;
        if (!usuario) {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
            return;
        }
        // Obtener el usuario completo de la base de datos para asegurar que tenemos los datos más recientes
        const usuarioCompleto = await User_1.default.findByPk(usuario.id);
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
    }
    catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ mensaje: 'Error al obtener perfil' });
    }
};
exports.obtenerPerfil = obtenerPerfil;
// Endpoint para refrescar el access token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: refreshTokenString } = req.body;
        if (!refreshTokenString) {
            res.status(400).json({ mensaje: 'Refresh token es requerido' });
            return;
        }
        const tokens = await refreshToken_service_1.default.refreshAccessToken(refreshTokenString);
        if (!tokens) {
            res.status(401).json({ mensaje: 'Refresh token inválido o expirado' });
            return;
        }
        res.json(tokens);
    }
    catch (error) {
        console.error('Error al refrescar token:', error);
        res.status(500).json({ mensaje: 'Error al refrescar token' });
    }
};
exports.refreshToken = refreshToken;
// Endpoint para logout (revocar refresh token)
const logout = async (req, res) => {
    try {
        const { refreshToken: refreshTokenString } = req.body;
        if (!refreshTokenString) {
            res.status(400).json({ mensaje: 'Refresh token es requerido' });
            return;
        }
        const revoked = await refreshToken_service_1.default.revokeRefreshToken(refreshTokenString);
        if (!revoked) {
            res.status(404).json({ mensaje: 'Refresh token no encontrado' });
            return;
        }
        res.json({ mensaje: 'Sesión cerrada exitosamente' });
    }
    catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ mensaje: 'Error al cerrar sesión' });
    }
};
exports.logout = logout;
// Endpoint para logout en todos los dispositivos
const logoutAll = async (req, res) => {
    try {
        const usuario = req.usuario;
        if (!usuario) {
            res.status(401).json({ mensaje: 'Usuario no autenticado' });
            return;
        }
        await refreshToken_service_1.default.revokeAllUserTokens(usuario.id);
        res.json({ mensaje: 'Sesiones cerradas en todos los dispositivos' });
    }
    catch (error) {
        console.error('Error al cerrar todas las sesiones:', error);
        res.status(500).json({ mensaje: 'Error al cerrar todas las sesiones' });
    }
};
exports.logoutAll = logoutAll;
// Endpoint para limpiar tokens expirados (para mantenimiento)
const cleanupTokens = async (req, res) => {
    try {
        await refreshToken_service_1.default.cleanupExpiredTokens();
        res.json({ mensaje: 'Tokens expirados limpiados exitosamente' });
    }
    catch (error) {
        console.error('Error al limpiar tokens:', error);
        res.status(500).json({ mensaje: 'Error al limpiar tokens expirados' });
    }
};
exports.cleanupTokens = cleanupTokens;
