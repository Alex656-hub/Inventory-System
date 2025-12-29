import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn('usuarios', 'twoFactorEnabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('usuarios', 'twoFactorSecret', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('usuarios', 'backupCodes', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('usuarios', 'twoFactorEnabled');
    await queryInterface.removeColumn('usuarios', 'twoFactorSecret');
    await queryInterface.removeColumn('usuarios', 'backupCodes');
  }
};
