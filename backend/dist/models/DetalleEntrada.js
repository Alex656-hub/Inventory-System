"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Product_1 = __importDefault(require("./Product"));
const EntradaInventario_1 = __importDefault(require("./EntradaInventario"));
class DetalleEntrada extends sequelize_1.Model {
}
DetalleEntrada.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    entrada_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'entradas_inventario',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    producto_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'productos',
            key: 'id'
        }
    },
    cantidad: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    precio_unitario: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    subtotal: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'detalle_entradas',
    timestamps: true,
    indexes: [
        {
            fields: ['entrada_id']
        },
        {
            fields: ['producto_id']
        }
    ]
});
// Definir relaciones
DetalleEntrada.belongsTo(EntradaInventario_1.default, { foreignKey: 'entrada_id', as: 'entrada' });
DetalleEntrada.belongsTo(Product_1.default, { foreignKey: 'producto_id', as: 'producto' });
// Definir relación inversa en EntradaInventario (se hace después de que ambos modelos estén cargados)
setTimeout(() => {
    const EntradaInventarioModel = require('./EntradaInventario').default;
    EntradaInventarioModel.hasMany(DetalleEntrada, { foreignKey: 'entrada_id', as: 'detalles' });
}, 0);
exports.default = DetalleEntrada;
