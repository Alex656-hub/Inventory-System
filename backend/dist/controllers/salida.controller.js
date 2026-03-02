"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarSalida = exports.crearSalida = exports.obtenerSalidaPorId = exports.obtenerSalidas = void 0;
const database_1 = require("../config/database");
const sequelize_1 = require("sequelize");
const SalidaInventario_1 = __importDefault(require("../models/SalidaInventario"));
const DetalleSalida_1 = __importDefault(require("../models/DetalleSalida"));
const Product_1 = __importDefault(require("../models/Product"));
const MovimientoInventario_1 = __importDefault(require("../models/MovimientoInventario"));
const User_1 = __importDefault(require("../models/User"));
const sales_1 = require("../models/sales");
const alertService_1 = require("../services/alertService");
const obtenerSalidas = async (req, res) => {
    try {
        const { pagina = 1, limite = 10, fecha_desde, fecha_hasta } = req.query;
        const offset = (Number(pagina) - 1) * Number(limite);
        const where = {};
        if (fecha_desde || fecha_hasta) {
            where.fecha = {};
            if (fecha_desde)
                where.fecha[sequelize_1.Op.gte] = fecha_desde;
            if (fecha_hasta)
                where.fecha[sequelize_1.Op.lte] = fecha_hasta;
        }
        const { count, rows } = await SalidaInventario_1.default.findAndCountAll({
            where,
            include: [
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre'] }
            ],
            limit: Number(limite),
            offset,
            order: [['fecha', 'DESC']]
        });
        res.json({
            salidas: rows,
            paginacion: {
                total: count,
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(count / Number(limite))
            }
        });
    }
    catch (error) {
        console.error('Error al obtener salidas:', error);
        res.status(500).json({ mensaje: 'Error al obtener salidas' });
    }
};
exports.obtenerSalidas = obtenerSalidas;
const obtenerSalidaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const salida = await SalidaInventario_1.default.findByPk(id, {
            include: [
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
            ]
        });
        if (salida) {
            const detalles = await DetalleSalida_1.default.findAll({
                where: { salida_id: salida.id },
                include: [{ model: Product_1.default, as: 'producto' }]
            });
            salida.detalles = detalles;
        }
        if (!salida) {
            res.status(404).json({ mensaje: 'Salida no encontrada' });
            return;
        }
        res.json(salida);
    }
    catch (error) {
        console.error('Error al obtener salida:', error);
        res.status(500).json({ mensaje: 'Error al obtener salida' });
    }
};
exports.obtenerSalidaPorId = obtenerSalidaPorId;
const crearSalida = async (req, res) => {
    const transaction = await database_1.sequelize.transaction();
    try {
        const { numero_documento, fecha, cliente_nombre, cliente_documento, tipo_documento, numero_serie, metodo_pago, observaciones, detalles } = req.body;
        if (!req.usuario) {
            res.status(401).json({ mensaje: 'Usuario no autenticado' });
            return;
        }
        if (!numero_documento || !fecha || !detalles || detalles.length === 0) {
            res.status(400).json({ mensaje: 'Datos incompletos' });
            return;
        }
        // Verificar stock disponible antes de procesar
        for (const detalle of detalles) {
            const producto = await Product_1.default.findByPk(detalle.producto_id, { transaction });
            if (!producto) {
                throw new Error(`Producto ${detalle.producto_id} no encontrado`);
            }
            if (producto.stock_actual < detalle.cantidad) {
                throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}, Solicitado: ${detalle.cantidad}`);
            }
        }
        // Calcular total
        let total = 0;
        for (const detalle of detalles) {
            const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
            total += subtotal;
        }
        // Crear salida
        const salida = await SalidaInventario_1.default.create({
            numero_documento,
            fecha,
            cliente_nombre,
            cliente_documento,
            usuario_id: req.usuario.id,
            tipo_documento: tipo_documento || 'boleta',
            numero_serie,
            total,
            metodo_pago: metodo_pago || 'efectivo',
            estado: 'completado',
            observaciones
        }, { transaction });
        // Crear detalles y actualizar stock
        for (const detalle of detalles) {
            const producto = await Product_1.default.findByPk(detalle.producto_id, { transaction });
            const subtotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
            await DetalleSalida_1.default.create({
                salida_id: salida.id,
                producto_id: detalle.producto_id,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal
            }, { transaction });
            // Actualizar stock del producto
            const stockAnterior = producto.stock_actual;
            const stockNuevo = stockAnterior - Number(detalle.cantidad);
            await producto.update({
                stock_actual: stockNuevo
            }, { transaction });
            // Registrar movimiento
            await MovimientoInventario_1.default.create({
                producto_id: detalle.producto_id,
                tipo_movimiento: 'salida',
                referencia_id: salida.id,
                tipo_referencia: 'venta',
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                stock_anterior: stockAnterior,
                stock_nuevo: stockNuevo,
                usuario_id: req.usuario.id,
                fecha: salida.fecha,
                motivo: `Venta - ${salida.numero_documento}`
            }, { transaction });
            // Actualizar daily_sales
            const fechaVenta = new Date(salida.fecha);
            fechaVenta.setHours(0, 0, 0, 0); // Normalizar a inicio del día
            const costoUnitario = producto.precio_compra;
            const montoTotal = Number(detalle.cantidad) * Number(detalle.precio_unitario);
            const costoTotal = Number(detalle.cantidad) * Number(costoUnitario);
            const ganancia = montoTotal - costoTotal;
            // Buscar si ya existe un registro para esta fecha y producto
            const [dailySale, created] = await sales_1.DailySale.findOrCreate({
                where: {
                    date: fechaVenta,
                    productId: detalle.producto_id
                },
                defaults: {
                    date: fechaVenta,
                    productId: detalle.producto_id,
                    quantity: detalle.cantidad,
                    unitPrice: detalle.precio_unitario,
                    totalAmount: montoTotal,
                    costPrice: costoTotal,
                    profit: ganancia
                },
                transaction
            });
            // Si el registro ya existía, actualizarlo
            if (!created) {
                dailySale.quantity += Number(detalle.cantidad);
                dailySale.totalAmount += montoTotal;
                dailySale.costPrice += costoTotal;
                dailySale.profit += ganancia;
                // Actualizar el precio unitario al promedio ponderado
                dailySale.unitPrice = dailySale.totalAmount / dailySale.quantity;
                await dailySale.save({ transaction });
            }
        }
        await transaction.commit();
        // Verificar alertas después de la salida
        try {
            await alertService_1.alertService.checkLowStock();
            await alertService_1.alertService.checkOverstock();
        }
        catch (alertError) {
            console.error('Error al verificar alertas después de salida:', alertError);
        }
        const salidaCompleta = await SalidaInventario_1.default.findByPk(salida.id, {
            include: [
                { model: User_1.default, as: 'usuario', attributes: ['id', 'nombre'] }
            ]
        });
        if (salidaCompleta) {
            const detalles = await DetalleSalida_1.default.findAll({
                where: { salida_id: salidaCompleta.id },
                include: [{ model: Product_1.default, as: 'producto' }]
            });
            salidaCompleta.detalles = detalles;
        }
        res.status(201).json({
            mensaje: 'Salida registrada exitosamente',
            salida: salidaCompleta
        });
    }
    catch (error) {
        await transaction.rollback();
        console.error('Error al crear salida:', error);
        res.status(500).json({
            mensaje: 'Error al crear salida',
            error: error.message
        });
    }
};
exports.crearSalida = crearSalida;
const eliminarSalida = async (req, res) => {
    const transaction = await database_1.sequelize.transaction();
    try {
        const { id } = req.params;
        const salida = await SalidaInventario_1.default.findByPk(id, { transaction });
        if (!salida) {
            await transaction.rollback();
            res.status(404).json({ mensaje: 'Salida no encontrada' });
            return;
        }
        const detalles = await DetalleSalida_1.default.findAll({
            where: { salida_id: id },
            transaction
        });
        if (salida.estado === 'cancelado') {
            res.status(400).json({ mensaje: 'La salida ya está cancelada' });
            return;
        }
        // Revertir stock de productos
        for (const detalle of detalles) {
            const producto = await Product_1.default.findByPk(detalle.producto_id, { transaction });
            if (producto) {
                const stockAnterior = producto.stock_actual;
                const stockNuevo = stockAnterior + detalle.cantidad;
                await producto.update({ stock_actual: stockNuevo }, { transaction });
                // Registrar movimiento de reversión
                await MovimientoInventario_1.default.create({
                    producto_id: detalle.producto_id,
                    tipo_movimiento: 'ajuste',
                    referencia_id: salida.id,
                    tipo_referencia: 'eliminacion_venta',
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario,
                    stock_anterior: stockAnterior,
                    stock_nuevo: stockNuevo,
                    usuario_id: req.usuario?.id || 1,
                    motivo: `Eliminación de venta - ${salida.numero_documento}`
                }, { transaction });
            }
        }
        // Marcar como cancelada en lugar de eliminar
        await salida.update({ estado: 'cancelado' }, { transaction });
        await transaction.commit();
        res.json({ mensaje: 'Salida cancelada exitosamente' });
    }
    catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar salida:', error);
        res.status(500).json({
            mensaje: 'Error al eliminar salida',
            error: error.message
        });
    }
};
exports.eliminarSalida = eliminarSalida;
