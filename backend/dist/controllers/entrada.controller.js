"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarEntrada = exports.crearEntrada = exports.obtenerEntradaPorId = exports.obtenerEntradas = void 0;
const database_1 = require("../config/database");
const sequelize_1 = require("sequelize");
const EntradaInventario_1 = __importDefault(require("../models/EntradaInventario"));
const DetalleEntrada_1 = __importDefault(require("../models/DetalleEntrada"));
const Product_1 = __importDefault(require("../models/Product"));
const MovimientoInventario_1 = __importDefault(require("../models/MovimientoInventario"));
const Supplier_1 = __importDefault(require("../models/Supplier"));
const User_1 = __importDefault(require("../models/User"));
const alertService_1 = require("../services/alertService");
const obtenerEntradas = async (req, res) => {
    try {
        const { pagina = 1, limite = 10, fecha_desde, fecha_hasta, proveedor_id } = req.query;
        const offset = (Number(pagina) - 1) * Number(limite);
        const where = {};
        if (fecha_desde || fecha_hasta) {
            where.fecha = {};
            if (fecha_desde)
                where.fecha[sequelize_1.Op.gte] = fecha_desde;
            if (fecha_hasta)
                where.fecha[sequelize_1.Op.lte] = fecha_hasta;
        }
        if (proveedor_id) {
            where.proveedor_id = proveedor_id;
        }
        const { count, rows } = await EntradaInventario_1.default.findAndCountAll({
            where,
            include: [
                { model: Supplier_1.default, as: 'proveedor', attributes: ['id', 'nombre'] },
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre'] }
            ],
            limit: Number(limite),
            offset,
            order: [['fecha', 'DESC']]
        });
        res.json({
            entradas: rows,
            paginacion: {
                total: count,
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(count / Number(limite))
            }
        });
    }
    catch (error) {
        console.error('Error al obtener entradas:', error);
        res.status(500).json({ mensaje: 'Error al obtener entradas' });
    }
};
exports.obtenerEntradas = obtenerEntradas;
const obtenerEntradaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const entrada = await EntradaInventario_1.default.findByPk(id, {
            include: [
                { model: Supplier_1.default, as: 'proveedor' },
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
            ]
        });
        if (entrada) {
            const detalles = await DetalleEntrada_1.default.findAll({
                where: { entrada_id: entrada.id },
                include: [{ model: Product_1.default, as: 'producto' }]
            });
            entrada.detalles = detalles;
        }
        if (!entrada) {
            res.status(404).json({ mensaje: 'Entrada no encontrada' });
            return;
        }
        res.json(entrada);
    }
    catch (error) {
        console.error('Error al obtener entrada:', error);
        res.status(500).json({ mensaje: 'Error al obtener entrada' });
    }
};
exports.obtenerEntradaPorId = obtenerEntradaPorId;
const crearEntrada = async (req, res) => {
    const transaction = await database_1.sequelize.transaction();
    try {
        const { numero_documento, fecha, proveedor_id, tipo_documento, numero_serie, forma_pago, observaciones, detalles } = req.body;
        if (!req.usuario) {
            res.status(401).json({ mensaje: 'Usuario no autenticado' });
            return;
        }
        if (!numero_documento || !fecha || !proveedor_id || !detalles || detalles.length === 0) {
            res.status(400).json({ mensaje: 'Datos incompletos' });
            return;
        }
        // Calcular total
        let total = 0;
        for (const detalle of detalles) {
            const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
            total += subtotal;
        }
        // Crear entrada
        const entrada = await EntradaInventario_1.default.create({
            numero_documento,
            fecha,
            proveedor_id,
            usuario_id: req.usuario.id,
            tipo_documento: tipo_documento || 'factura',
            numero_serie,
            total,
            forma_pago: forma_pago || 'contado',
            estado: 'pagado',
            observaciones
        }, { transaction });
        // Crear detalles y actualizar stock
        for (const detalle of detalles) {
            const producto = await Product_1.default.findByPk(detalle.producto_id, { transaction });
            if (!producto) {
                throw new Error(`Producto ${detalle.producto_id} no encontrado`);
            }
            const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
            await DetalleEntrada_1.default.create({
                entrada_id: entrada.id,
                producto_id: detalle.producto_id,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal
            }, { transaction });
            // Actualizar stock del producto
            const stockAnterior = producto.stock_actual;
            const stockNuevo = stockAnterior + Number(detalle.cantidad);
            // Actualizar precio de compra si es necesario
            await producto.update({
                stock_actual: stockNuevo,
                precio_compra: detalle.precio_unitario // Actualizar último precio de compra
            }, { transaction });
            // Registrar movimiento
            await MovimientoInventario_1.default.create({
                producto_id: detalle.producto_id,
                tipo_movimiento: 'entrada',
                referencia_id: entrada.id,
                tipo_referencia: 'compra',
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                usuario_id: req.usuario.id,
                fecha: entrada.fecha,
                motivo: `Compra - ${entrada.numero_documento}`
            }, { transaction });
        }
        await transaction.commit();
        // Verificar alertas de sobrestock después de la entrada
        try {
            await alertService_1.alertService.checkOverstock();
        }
        catch (alertError) {
            console.error('Error al verificar alertas de sobrestock después de entrada:', alertError);
        }
        const entradaCompleta = await EntradaInventario_1.default.findByPk(entrada.id, {
            include: [
                { model: Supplier_1.default, as: 'proveedor' },
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre'] }
            ]
        });
        if (entradaCompleta) {
            const detalles = await DetalleEntrada_1.default.findAll({
                where: { entrada_id: entradaCompleta.id },
                include: [{ model: Product_1.default, as: 'producto' }]
            });
            entradaCompleta.detalles = detalles;
        }
        res.status(201).json({
            mensaje: 'Entrada registrada exitosamente',
            entrada: entradaCompleta
        });
    }
    catch (error) {
        await transaction.rollback();
        console.error('Error al crear entrada:', error);
        res.status(500).json({
            mensaje: 'Error al crear entrada',
            error: error.message
        });
    }
};
exports.crearEntrada = crearEntrada;
const eliminarEntrada = async (req, res) => {
    const transaction = await database_1.sequelize.transaction();
    try {
        const { id } = req.params;
        const entrada = await EntradaInventario_1.default.findByPk(id, { transaction });
        if (!entrada) {
            await transaction.rollback();
            res.status(404).json({ mensaje: 'Entrada no encontrada' });
            return;
        }
        const detalles = await DetalleEntrada_1.default.findAll({
            where: { entrada_id: id },
            transaction
        });
        // Revertir stock de productos
        for (const detalle of detalles) {
            const producto = await Product_1.default.findByPk(detalle.producto_id, { transaction });
            if (producto) {
                const stockAnterior = producto.stock_actual;
                const stockNuevo = stockAnterior - detalle.cantidad;
                if (stockNuevo < 0) {
                    throw new Error(`No se puede eliminar: stock insuficiente para producto ${producto.nombre}`);
                }
                await producto.update({ stock_actual: stockNuevo }, { transaction });
                // Registrar movimiento de reversión
                await MovimientoInventario_1.default.create({
                    producto_id: detalle.producto_id,
                    tipo_movimiento: 'ajuste',
                    referencia_id: entrada.id,
                    tipo_referencia: 'eliminacion_compra',
                    cantidad: -detalle.cantidad,
                    precio_unitario: detalle.precio_unitario,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    usuario_id: req.usuario?.id || 1,
                    motivo: `Eliminación de compra - ${entrada.numero_documento}`
                }, { transaction });
            }
        }
        // Eliminar detalles y entrada
        await DetalleEntrada_1.default.destroy({ where: { entrada_id: id }, transaction });
        await entrada.destroy({ transaction });
        await transaction.commit();
        res.json({ mensaje: 'Entrada eliminada exitosamente' });
    }
    catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar entrada:', error);
        res.status(500).json({
            mensaje: 'Error al eliminar entrada',
            error: error.message
        });
    }
};
exports.eliminarEntrada = eliminarEntrada;
