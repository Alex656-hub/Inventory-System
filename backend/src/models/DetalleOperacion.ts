import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import OperacionStock from './OperacionStock';

interface DetalleOperacionAttributes {
  id: number;
  operacion_id: number;
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  lote?: string;
  fecha_vencimiento?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DetalleOperacionCreationAttributes extends Optional<DetalleOperacionAttributes, 'id' | 'lote' | 'fecha_vencimiento' | 'createdAt' | 'updatedAt'> {}

class DetalleOperacion extends Model<DetalleOperacionAttributes, DetalleOperacionCreationAttributes> implements DetalleOperacionAttributes {
  public id!: number;
  public operacion_id!: number;
  public producto_id!: number;
  public cantidad!: number;
  public costo_unitario!: number;
  public subtotal!: number;
  public lote?: string;
  public fecha_vencimiento?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public operacion?: OperacionStock;
  public producto?: Product;
}

DetalleOperacion.init(
  {
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
      allowNull: false,
      validate: {
        min: 1
      }
    },
    costo_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    lote: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fecha_vencimiento: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'detalles_operacion',
    timestamps: true,
    indexes: [
      {
        fields: ['operacion_id']
      },
      {
        fields: ['producto_id']
      },
      {
        fields: ['lote']
      }
    ]
  }
);

// Definir relaciones
DetalleOperacion.belongsTo(OperacionStock, { foreignKey: 'operacion_id', as: 'operacion' });
DetalleOperacion.belongsTo(Product, { foreignKey: 'producto_id', as: 'producto' });

// Relaciones inversas
OperacionStock.hasMany(DetalleOperacion, { foreignKey: 'operacion_id', as: 'detalles' });
Product.hasMany(DetalleOperacion, { foreignKey: 'producto_id', as: 'detalles_operacion' });

export default DetalleOperacion;
