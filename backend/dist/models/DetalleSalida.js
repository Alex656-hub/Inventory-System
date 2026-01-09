"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Product_1 = __importDefault(require("./Product"));
const SalidaInventario_1 = __importDefault(require("./SalidaInventario"));
class DetalleSalida extends sequelize_1.Model {
}
DetalleSalida.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    salida_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'salidas_inventario',
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
    tableName: 'detalle_salidas',
    timestamps: true,
    indexes: [
        {
            fields: ['salida_id']
        },
        {
            fields: ['producto_id']
        }
    ]
});
// Definir relaciones
DetalleSalida.belongsTo(SalidaInventario_1.default, { foreignKey: 'salida_id', as: 'salida' });
DetalleSalida.belongsTo(Product_1.default, { foreignKey: 'producto_id', as: 'producto' });
// Definir relación inversa en SalidaInventario (se hace después de que ambos modelos estén cargados)
setTimeout(() => {
    const SalidaInventarioModel = require('./SalidaInventario').default;
    SalidaInventarioModel.hasMany(DetalleSalida, { foreignKey: 'salida_id', as: 'detalles' });
}, 0);
exports.default = DetalleSalida;
