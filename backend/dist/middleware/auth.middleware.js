"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerenteOEmpleado = exports.soloGerente = exports.verificarRol = exports.verificarToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const verificarToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ mensaje: 'Token de autenticación requerido' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const usuario = await User_1.default.findByPk(decoded.id);
        if (!usuario || !usuario.activo) {
            res.status(401).json({ mensaje: 'Usuario no válido o inactivo' });
            return;
        }
        req.usuario = usuario;
        next();
    }
    catch (error) {
        res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
};
exports.verificarToken = verificarToken;
const verificarRol = (roles) => {
    return (req, res, next) => {
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
exports.verificarRol = verificarRol;
exports.soloGerente = (0, exports.verificarRol)(['gerente']);
exports.gerenteOEmpleado = (0, exports.verificarRol)(['gerente', 'empleado']);
