"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/models/User.ts
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User extends sequelize_1.Model {
    // Método para verificar contraseña
    async verificarPassword(password) {
        return bcryptjs_1.default.compare(password, this.password);
    }
    // Nuevo método para verificar códigos 2FA
    async verificarCodigo2FA(token) {
        if (!this.twoFactorEnabled || !this.twoFactorSecret) {
            return false;
        }
        const speakeasy = require('speakeasy');
        return speakeasy.totp.verify({
            secret: this.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1 // Permite códigos del paso de tiempo anterior y siguiente
        });
    }
    // Método para generar códigos de respaldo
    generarCodigosRespaldo() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
        }
        this.backupCodes = JSON.stringify(codes);
        return codes;
    }
    // Método para verificar códigos de respaldo
    verificarCodigoRespaldo(token) {
        if (!this.backupCodes)
            return false;
        const codes = JSON.parse(this.backupCodes);
        const index = codes.indexOf(token);
        if (index !== -1) {
            // Eliminar el código usado
            codes.splice(index, 1);
            this.backupCodes = JSON.stringify(codes);
            return true;
        }
        return false;
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    rol: {
        type: sequelize_1.DataTypes.ENUM('gerente', 'empleado'),
        allowNull: false,
        defaultValue: 'empleado'
    },
    activo: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true
    },
    // Nuevos campos para 2FA
    twoFactorEnabled: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    twoFactorSecret: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    backupCodes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize: database_1.sequelize,
    tableName: 'usuarios',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcryptjs_1.default.genSalt(10);
                user.password = await bcryptjs_1.default.hash(user.password, salt);
            }
        }
    }
});
exports.default = User;
