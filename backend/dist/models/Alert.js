"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const Product_1 = __importDefault(require("./Product"));
const User_1 = __importDefault(require("./User"));
class Alert extends sequelize_1.Model {
}
Alert.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('low_stock', 'overstock', 'demand_trend'),
        allowNull: false
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false
    },
    severity: {
        type: sequelize_1.DataTypes.ENUM('high', 'medium', 'low'),
        allowNull: false
    },
    product_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'productos',
            key: 'id'
        }
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    resolved: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'alertas',
    timestamps: true,
    indexes: [
        {
            fields: ['type']
        },
        {
            fields: ['severity']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['resolved']
        }
    ]
});
// Definir relaciones
Alert.belongsTo(Product_1.default, { foreignKey: 'product_id', as: 'product' });
Alert.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
exports.default = Alert;
