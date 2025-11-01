import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import EntradaInventario from './EntradaInventario';

interface DetalleEntradaAttributes {
  id: number;
  entrada_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DetalleEntradaCreationAttributes extends Optional<DetalleEntradaAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class DetalleEntrada extends Model<DetalleEntradaAttributes, DetalleEntradaCreationAttributes> implements DetalleEntradaAttributes {
  public id!: number;
  public entrada_id!: number;
  public producto_id!: number;
  public cantidad!: number;
  public precio_unitario!: number;
  public subtotal!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public entrada?: EntradaInventario;
  public producto?: Product;
}

DetalleEntrada.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    entrada_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'entradas_inventario',
        key: 'id'
      },
      onDelete: 'CASCADE'
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
      allowNull: false,
      validate: {
        min: 1
      }
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    }
  },
  {
    sequelize,
    tableName: 'detalle_entradas',
    timestamps: true,
    indexes: [
      {
        fields: ['entrada_id']
      },
      {
        fields: ['producto_id']
      }
    ]
  }
);

// Definir relaciones
DetalleEntrada.belongsTo(EntradaInventario, { foreignKey: 'entrada_id', as: 'entrada' });
DetalleEntrada.belongsTo(Product, { foreignKey: 'producto_id', as: 'producto' });

// Definir relación inversa en EntradaInventario (se hace después de que ambos modelos estén cargados)
setTimeout(() => {
  const EntradaInventarioModel = require('./EntradaInventario').default;
  EntradaInventarioModel.hasMany(DetalleEntrada, { foreignKey: 'entrada_id', as: 'detalles' });
}, 0);

export default DetalleEntrada;

