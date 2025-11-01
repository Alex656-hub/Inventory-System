"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Category_1 = __importDefault(require("./Category"));
const Supplier_1 = __importDefault(require("./Supplier"));
class Product extends sequelize_1.Model {
}
Product.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    codigo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    nombre: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false
    },
    descripcion: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    categoria_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categorias',
            key: 'id'
        }
    },
    proveedor_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'proveedores',
            key: 'id'
        }
    },
    precio_compra: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    precio_venta: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    stock_actual: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    stock_minimo: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    ubicacion: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    imagen_url: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    activo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'productos',
    timestamps: true,
    indexes: [
        {
            fields: ['codigo']
        },
        {
            fields: ['categoria_id']
        },
        {
            fields: ['proveedor_id']
        }
    ]
});
// Definir relaciones
Product.belongsTo(Category_1.default, { foreignKey: 'categoria_id', as: 'categoria' });
Product.belongsTo(Supplier_1.default, { foreignKey: 'proveedor_id', as: 'proveedor' });
exports.default = Product;
