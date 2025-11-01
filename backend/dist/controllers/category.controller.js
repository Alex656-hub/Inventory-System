"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarCategoria = exports.actualizarCategoria = exports.crearCategoria = exports.obtenerCategoriaPorId = exports.obtenerCategorias = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const obtenerCategorias = async (req, res) => {
    try {
        const { activa } = req.query;
        const where = {};
        if (activa !== undefined) {
            where.activa = activa === 'true';
        }
        const categorias = await Category_1.default.findAll({
            where,
            order: [['nombre', 'ASC']]
        });
        res.json({ categorias });
    }
    catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ mensaje: 'Error al obtener categorías' });
    }
};
exports.obtenerCategorias = obtenerCategorias;
const obtenerCategoriaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const categoria = await Category_1.default.findByPk(id);
        if (!categoria) {
            res.status(404).json({ mensaje: 'Categoría no encontrada' });
            return;
        }
        res.json(categoria);
    }
    catch (error) {
        console.error('Error al obtener categoría:', error);
        res.status(500).json({ mensaje: 'Error al obtener categoría' });
    }
};
exports.obtenerCategoriaPorId = obtenerCategoriaPorId;
const crearCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) {
            res.status(400).json({ mensaje: 'El nombre es requerido' });
            return;
        }
        const categoria = await Category_1.default.create({ nombre, descripcion });
        res.status(201).json({
            mensaje: 'Categoría creada exitosamente',
            categoria
        });
    }
    catch (error) {
        console.error('Error al crear categoría:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ mensaje: 'El nombre de categoría ya existe' });
            return;
        }
        res.status(500).json({ mensaje: 'Error al crear categoría' });
    }
};
exports.crearCategoria = crearCategoria;
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = req.body;
        const categoria = await Category_1.default.findByPk(id);
        if (!categoria) {
            res.status(404).json({ mensaje: 'Categoría no encontrada' });
            return;
        }
        await categoria.update(datos);
        res.json({
            mensaje: 'Categoría actualizada exitosamente',
            categoria
        });
    }
    catch (error) {
        console.error('Error al actualizar categoría:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ mensaje: 'El nombre de categoría ya existe' });
            return;
        }
        res.status(500).json({ mensaje: 'Error al actualizar categoría' });
    }
};
exports.actualizarCategoria = actualizarCategoria;
const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const categoria = await Category_1.default.findByPk(id);
        if (!categoria) {
            res.status(404).json({ mensaje: 'Categoría no encontrada' });
            return;
        }
        // Soft delete: marcar como inactiva
        await categoria.update({ activa: false });
        res.json({ mensaje: 'Categoría eliminada exitosamente' });
    }
    catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ mensaje: 'Error al eliminar categoría' });
    }
};
exports.eliminarCategoria = eliminarCategoria;
