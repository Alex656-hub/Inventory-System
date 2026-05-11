import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Crear tabla de stock por sede
  await queryInterface.createTable('stock_por_sede', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos',
        key: 'id'
      }
    },
    sede_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sedes',
        key: 'id'
      }
    },
    almacen_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'almacenes',
        key: 'id'
      }
    },
    cantidad_actual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stock_minimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ultimo_movimiento: {
      type: DataTypes.DATE,
      allowNull: false
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

  // Crear índice único compuesto
  await queryInterface.addIndex('stock_por_sede', ['producto_id', 'sede_id', 'almacen_id'], {
    unique: true,
    name: 'stock_por_sede_unique_product_sede_almacen'
  });

  // Crear otros índices
  await queryInterface.addIndex('stock_por_sede', ['producto_id']);
  await queryInterface.addIndex('stock_por_sede', ['sede_id']);
  await queryInterface.addIndex('stock_por_sede', ['almacen_id']);
  await queryInterface.addIndex('stock_por_sede', ['cantidad_actual']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Eliminar tabla stock_por_sede
  await queryInterface.dropTable('stock_por_sede');
}
