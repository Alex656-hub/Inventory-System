"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const User_1 = __importDefault(require("./User"));
class RefreshToken extends sequelize_1.Model {
    // Método para verificar si el token ha expirado
    isExpired() {
        return new Date() > this.expiresAt;
    }
    // Método para verificar si el token es válido
    isValid() {
        return !this.isRevoked && !this.isExpired();
    }
}
RefreshToken.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    token: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    isRevoked: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true,
});
// Configurar asociaciones
RefreshToken.belongsTo(User_1.default, {
    foreignKey: 'userId',
    as: 'user'
});
User_1.default.hasMany(RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens'
});
exports.default = RefreshToken;
