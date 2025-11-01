"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerPerfil = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const generarToken = (usuario) => {
    const payload = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol
    };
    const secret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    return jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: expiresIn
    });
};
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
        const token = generarToken(usuario);
        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error al iniciar sesión' });
    }
};
exports.login = login;
const obtenerPerfil = async (req, res) => {
    try {
        if (!req.usuario) {
            res.status(401).json({ mensaje: 'Usuario no autenticado' });
            return;
        }
        res.json({
            id: req.usuario.id,
            nombre: req.usuario.nombre,
            email: req.usuario.email,
            rol: req.usuario.rol
        });
    }
    catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ mensaje: 'Error al obtener perfil' });
    }
};
exports.obtenerPerfil = obtenerPerfil;
