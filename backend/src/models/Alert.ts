import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import User from './User';

interface AlertAttributes {
  id: number;
  type: 'out_of_stock' | 'low_stock' | 'overstock' | 'demand_trend';
  message: string;
  severity: 'high' | 'medium' | 'low';
  product_id: number;
  user_id: number;
  resolved: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AlertCreationAttributes extends Optional<AlertAttributes, 'id' | 'resolved' | 'createdAt' | 'updatedAt'> {}

class Alert extends Model<AlertAttributes, AlertCreationAttributes> implements AlertAttributes {
  public id!: number;
  public type!: 'out_of_stock' | 'low_stock' | 'overstock' | 'demand_trend';
  public message!: string;
  public severity!: 'high' | 'medium' | 'low';
  public product_id!: number;
  public user_id!: number;
  public resolved!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public product?: Product;
  public user?: User;
}

Alert.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('out_of_stock', 'low_stock', 'overstock', 'demand_trend'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('high', 'medium', 'low'),
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    tableName: 'alertas',
    timestamps: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['resolved']
      }
    ]
  }
);

// Definir relaciones
Alert.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Alert.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default Alert;
