"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Product_1 = __importDefault(require("./Product"));
const User_1 = __importDefault(require("./User"));
class MovimientoInventario extends sequelize_1.Model {
}
MovimientoInventario.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    producto_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'productos',
            key: 'id'
        }
    },
    tipo_movimiento: {
        type: sequelize_1.DataTypes.ENUM('entrada', 'salida', 'ajuste'),
        allowNull: false
    },
    referencia_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true
    },
    tipo_referencia: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: true
    },
    cantidad: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    precio_unitario: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    stock_anterior: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    stock_nuevo: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    usuario_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    fecha: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    motivo: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: true
    },
    observaciones: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'movimientos_inventario',
    timestamps: true,
    indexes: [
        {
            fields: ['producto_id']
        },
        {
            fields: ['fecha']
        },
        {
            fields: ['tipo_movimiento']
        },
        {
            fields: ['usuario_id']
        }
    ]
});
// Definir relaciones
MovimientoInventario.belongsTo(Product_1.default, { foreignKey: 'producto_id', as: 'producto' });
MovimientoInventario.belongsTo(User_1.default, { foreignKey: 'usuario_id', as: 'usuario' });
exports.default = MovimientoInventario;
