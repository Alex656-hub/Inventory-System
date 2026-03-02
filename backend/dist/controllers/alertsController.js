"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = exports.resolveAlert = exports.checkAlerts = exports.getAlerts = void 0;
const alertService_1 = require("../services/alertService");
const Alert_1 = __importDefault(require("../models/Alert"));
const Product_1 = __importDefault(require("../models/Product"));
const User_1 = __importDefault(require("../models/User"));
const getAlerts = async (req, res) => {
    try {
        const { pagina = 1, limite = 10, resolved, type, severity } = req.query;
        const offset = (Number(pagina) - 1) * Number(limite);
        const where = {};
        if (resolved !== undefined) {
            where.resolved = resolved === 'true';
        }
        if (type) {
            where.type = type;
        }
        if (severity) {
            where.severity = severity;
        }
        const { count, rows } = await Alert_1.default.findAndCountAll({
            where,
            include: [
                {
                    model: Product_1.default,
                    as: 'product',
                    attributes: ['id', 'codigo', 'nombre']
                },
                {
                    model: User_1.default,
                    as: 'user',
                    attributes: ['id', 'nombre', 'email']
                }
            ],
            limit: Number(limite),
            offset,
            order: [['createdAt', 'DESC']]
        });
        res.json({
            alertas: rows,
            paginacion: {
                total: count,
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(count / Number(limite))
            }
        });
    }
    catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
exports.getAlerts = getAlerts;
const checkAlerts = async (req, res) => {
    try {
        await alertService_1.alertService.checkAllAlerts();
        res.json({ mensaje: 'Verificación de alertas completada' });
    }
    catch (error) {
        console.error('Error al verificar alertas:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
exports.checkAlerts = checkAlerts;
const resolveAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const alert = await Alert_1.default.findByPk(id);
        if (!alert) {
            res.status(404).json({ mensaje: 'Alerta no encontrada' });
            return;
        }
        alert.resolved = true;
        await alert.save();
        res.json({ mensaje: 'Alerta resuelta exitosamente' });
    }
    catch (error) {
        console.error('Error al resolver alerta:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
exports.resolveAlert = resolveAlert;
const getRecommendations = async (req, res) => {
    try {
        const recommendations = await alertService_1.alertService.generateRecommendations();
        res.json({ recomendaciones: recommendations });
    }
    catch (error) {
        console.error('Error al obtener recomendaciones:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
exports.getRecommendations = getRecommendations;
