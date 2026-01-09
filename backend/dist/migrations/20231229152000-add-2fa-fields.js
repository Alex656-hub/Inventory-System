"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn('usuarios', 'twoFactorEnabled', {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
        await queryInterface.addColumn('usuarios', 'twoFactorSecret', {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('usuarios', 'backupCodes', {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true
        });
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn('usuarios', 'twoFactorEnabled');
        await queryInterface.removeColumn('usuarios', 'twoFactorSecret');
        await queryInterface.removeColumn('usuarios', 'backupCodes');
    }
};
