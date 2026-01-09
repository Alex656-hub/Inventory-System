"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = __importDefault(require("./User"));
class SalidaInventario extends sequelize_1.Model {
}
SalidaInventario.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    numero_documento: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    fecha: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    cliente_nombre: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: true
    },
    cliente_documento: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true
    },
    usuario_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    tipo_documento: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'boleta'
    },
    numero_serie: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true
    },
    total: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    metodo_pago: {
        type: sequelize_1.DataTypes.ENUM('efectivo', 'credito', 'tarjeta'),
        allowNull: false,
        defaultValue: 'efectivo'
    },
    estado: {
        type: sequelize_1.DataTypes.ENUM('completado', 'cancelado'),
        allowNull: false,
        defaultValue: 'completado'
    },
    observaciones: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'salidas_inventario',
    timestamps: true,
    indexes: [
        {
            fields: ['numero_documento']
        },
        {
            fields: ['fecha']
        },
        {
            fields: ['usuario_id']
        }
    ]
});
// Definir relaciones (hasMany se define después de que DetalleSalida esté cargado)
SalidaInventario.belongsTo(User_1.default, { foreignKey: 'usuario_id', as: 'usuario' });
exports.default = SalidaInventario;
