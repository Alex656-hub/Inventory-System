import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      isRevoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Índices para mejor rendimiento
    await queryInterface.addIndex('refresh_tokens', ['token']);
    await queryInterface.addIndex('refresh_tokens', ['userId']);
    await queryInterface.addIndex('refresh_tokens', ['expiresAt']);
    await queryInterface.addIndex('refresh_tokens', ['isRevoked']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('refresh_tokens');
  },
};
