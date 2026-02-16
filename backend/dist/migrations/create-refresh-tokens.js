"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable('refresh_tokens', {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            token: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: false,
                unique: true,
            },
            userId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
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
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        });
        // Índices para mejor rendimiento
        await queryInterface.addIndex('refresh_tokens', ['token']);
        await queryInterface.addIndex('refresh_tokens', ['userId']);
        await queryInterface.addIndex('refresh_tokens', ['expiresAt']);
        await queryInterface.addIndex('refresh_tokens', ['isRevoked']);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable('refresh_tokens');
    },
};
