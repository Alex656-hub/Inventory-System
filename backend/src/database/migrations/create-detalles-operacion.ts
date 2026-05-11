import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Crear tabla de detalles de operación
  await queryInterface.createTable('detalles_operacion', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    operacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'operaciones_stock',
        key: 'id'
      }
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos',
        key: 'id'
      }
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    costo_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    lote: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fecha_vencimiento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Crear índices
  await queryInterface.addIndex('detalles_operacion', ['operacion_id']);
  await queryInterface.addIndex('detalles_operacion', ['producto_id']);
  await queryInterface.addIndex('detalles_operacion', ['lote']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Eliminar tabla detalles_operacion
  await queryInterface.dropTable('detalles_operacion');
}
