import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import ProductModel from './Product';

export interface DailySaleAttributes {
  id?: number;
  date: Date;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  costPrice: number;
  profit: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class DailySale extends Model<DailySaleAttributes> implements DailySaleAttributes {
  public id!: number;
  public date!: Date;
  public productId!: number;
  public quantity!: number;
  public unitPrice!: number;
  public totalAmount!: number;
  public costPrice!: number;
  public profit!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DailySale.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: {
        model: ProductModel,
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'cost_price',
    },
    profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'daily_sales',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['date', 'product_id'],
        name: 'daily_sales_date_product_id_unique',
      },
    ],
  }
);

export default DailySale;
