import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import SalidaInventario from './SalidaInventario';

interface DetalleSalidaAttributes {
  id: number;
  salida_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DetalleSalidaCreationAttributes extends Optional<DetalleSalidaAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class DetalleSalida extends Model<DetalleSalidaAttributes, DetalleSalidaCreationAttributes> implements DetalleSalidaAttributes {
  public id!: number;
  public salida_id!: number;
  public producto_id!: number;
  public cantidad!: number;
  public precio_unitario!: number;
  public subtotal!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public salida?: SalidaInventario;
  public producto?: Product;
}

DetalleSalida.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    salida_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salidas_inventario',
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
    tableName: 'detalle_salidas',
    timestamps: true,
    indexes: [
      {
        fields: ['salida_id']
      },
      {
        fields: ['producto_id']
      }
    ]
  }
);

// Definir relaciones
DetalleSalida.belongsTo(SalidaInventario, { foreignKey: 'salida_id', as: 'salida' });
DetalleSalida.belongsTo(Product, { foreignKey: 'producto_id', as: 'producto' });

// Definir relación inversa en SalidaInventario (se hace después de que ambos modelos estén cargados)
setTimeout(() => {
  const SalidaInventarioModel = require('./SalidaInventario').default;
  SalidaInventarioModel.hasMany(DetalleSalida, { foreignKey: 'salida_id', as: 'detalles' });
}, 0);

export default DetalleSalida;

