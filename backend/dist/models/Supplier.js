"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Supplier extends sequelize_1.Model {
}
Supplier.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false
    },
    ruc_dni: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    contacto_telefono: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: true
    },
    contacto_email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    direccion: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    condiciones_pago: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    activo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'proveedores',
    timestamps: true
});
exports.default = Supplier;
