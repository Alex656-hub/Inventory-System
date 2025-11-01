"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarProveedor = exports.actualizarProveedor = exports.crearProveedor = exports.obtenerProveedorPorId = exports.obtenerProveedores = void 0;
const Supplier_1 = __importDefault(require("../models/Supplier"));
const sequelize_1 = require("sequelize");
const obtenerProveedores = async (req, res) => {
    try {
        const { pagina = 1, limite = 10, busqueda, activo } = req.query;
        const offset = (Number(pagina) - 1) * Number(limite);
        const where = {};
        if (busqueda) {
            where[sequelize_1.Op.or] = [
                { nombre: { [sequelize_1.Op.iLike]: `%${busqueda}%` } },
                { ruc_dni: { [sequelize_1.Op.iLike]: `%${busqueda}%` } }
            ];
        }
        if (activo !== undefined) {
            where.activo = activo === 'true';
        }
        const { count, rows } = await Supplier_1.default.findAndCountAll({
            where,
            limit: Number(limite),
            offset,
            order: [['nombre', 'ASC']]
        });
        res.json({
            proveedores: rows,
            paginacion: {
                total: count,
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(count / Number(limite))
            }
        });
    }
    catch (error) {
        console.error('Error al obtener proveedores:', error);
        res.status(500).json({ mensaje: 'Error al obtener proveedores' });
    }
};
exports.obtenerProveedores = obtenerProveedores;
const obtenerProveedorPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await Supplier_1.default.findByPk(id);
        if (!proveedor) {
            res.status(404).json({ mensaje: 'Proveedor no encontrado' });
            return;
        }
        res.json(proveedor);
    }
    catch (error) {
        console.error('Error al obtener proveedor:', error);
        res.status(500).json({ mensaje: 'Error al obtener proveedor' });
    }
};
exports.obtenerProveedorPorId = obtenerProveedorPorId;
const crearProveedor = async (req, res) => {
    try {
        const { nombre, ruc_dni, contacto_telefono, contacto_email, direccion, condiciones_pago } = req.body;
        if (!nombre || !ruc_dni) {
            res.status(400).json({ mensaje: 'Nombre y RUC/DNI son requeridos' });
            return;
        }
        const proveedor = await Supplier_1.default.create({
            nombre,
            ruc_dni,
            contacto_telefono,
            contacto_email,
            direccion,
            condiciones_pago
        });
        res.status(201).json({
            mensaje: 'Proveedor creado exitosamente',
            proveedor
        });
    }
    catch (error) {
        console.error('Error al crear proveedor:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ mensaje: 'El RUC/DNI ya está registrado' });
            return;
        }
        res.status(500).json({ mensaje: 'Error al crear proveedor' });
    }
};
exports.crearProveedor = crearProveedor;
const actualizarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = req.body;
        const proveedor = await Supplier_1.default.findByPk(id);
        if (!proveedor) {
            res.status(404).json({ mensaje: 'Proveedor no encontrado' });
            return;
        }
        // Si se actualiza el RUC/DNI, verificar que no existe en otro proveedor
        if (datos.ruc_dni && datos.ruc_dni !== proveedor.ruc_dni) {
            const proveedorExistente = await Supplier_1.default.findOne({ where: { ruc_dni: datos.ruc_dni } });
            if (proveedorExistente) {
                res.status(400).json({ mensaje: 'El RUC/DNI ya está registrado' });
                return;
            }
        }
        await proveedor.update(datos);
        res.json({
            mensaje: 'Proveedor actualizado exitosamente',
            proveedor
        });
    }
    catch (error) {
        console.error('Error al actualizar proveedor:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ mensaje: 'El RUC/DNI ya está registrado' });
            return;
        }
        res.status(500).json({ mensaje: 'Error al actualizar proveedor' });
    }
};
exports.actualizarProveedor = actualizarProveedor;
const eliminarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await Supplier_1.default.findByPk(id);
        if (!proveedor) {
            res.status(404).json({ mensaje: 'Proveedor no encontrado' });
            return;
        }
        // Soft delete: marcar como inactivo
        await proveedor.update({ activo: false });
        res.json({ mensaje: 'Proveedor eliminado exitosamente' });
    }
    catch (error) {
        console.error('Error al eliminar proveedor:', error);
        res.status(500).json({ mensaje: 'Error al eliminar proveedor' });
    }
};
exports.eliminarProveedor = eliminarProveedor;
