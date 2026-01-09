"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Supplier_1 = __importDefault(require("./Supplier"));
const User_1 = __importDefault(require("./User"));
class EntradaInventario extends sequelize_1.Model {
}
EntradaInventario.init({
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
    proveedor_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'proveedores',
            key: 'id'
        }
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
        defaultValue: 'factura'
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
    forma_pago: {
        type: sequelize_1.DataTypes.ENUM('contado', 'credito'),
        allowNull: false,
        defaultValue: 'contado'
    },
    estado: {
        type: sequelize_1.DataTypes.ENUM('pendiente', 'pagado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pagado'
    },
    observaciones: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'entradas_inventario',
    timestamps: true,
    indexes: [
        {
            fields: ['numero_documento']
        },
        {
            fields: ['proveedor_id']
        },
        {
            fields: ['fecha']
        }
    ]
});
// Definir relaciones (hasMany se define después de que DetalleEntrada esté cargado)
EntradaInventario.belongsTo(Supplier_1.default, { foreignKey: 'proveedor_id', as: 'proveedor' });
EntradaInventario.belongsTo(User_1.default, { foreignKey: 'usuario_id', as: 'usuario' });
exports.default = EntradaInventario;
