"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerPerfil = exports.login = exports.generarTokenTemporal = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
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
        const usuario = await User_1.default.findOne({ where: { email } });
        if (!usuario) {
            res.status(401).json({ mensaje: 'Credenciales inválidas' });
            return;
        }
        if (!usuario.activo) {
            res.status(401).json({ mensaje: 'Usuario inactivo' });
            return;
        }
        const esPasswordValido = await usuario.verificarPassword(password);
        if (!esPasswordValido) {
            res.status(401).json({ mensaje: 'Credenciales inválidas' });
            return;
        }
        // Verificar si el usuario tiene 2FA habilitado
        if (usuario.twoFactorEnabled && usuario.twoFactorSecret) {
            // Generar token temporal para 2FA
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
            // Si no tiene 2FA habilitado, devolver token normal
            const token = generarToken(usuario);
            res.json({
                mensaje: 'Inicio de sesión exitoso',
                requiere2FA: false,
                token,
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
        res.status(500).json({ mensaje: 'Error al iniciar sesión' });
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
