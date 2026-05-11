import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import Sede from './Sede';
import Almacen from './Almacen';

interface StockPorSedeAttributes {
  id: number;
  producto_id: number;
  sede_id: number;
  almacen_id?: number;
  cantidad_actual: number;
  stock_minimo: number;
  ultimo_movimiento: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StockPorSedeCreationAttributes extends Optional<StockPorSedeAttributes, 'id' | 'almacen_id' | 'ultimo_movimiento' | 'createdAt' | 'updatedAt'> {}

class StockPorSede extends Model<StockPorSedeAttributes, StockPorSedeCreationAttributes> implements StockPorSedeAttributes {
  public id!: number;
  public producto_id!: number;
  public sede_id!: number;
  public almacen_id?: number;
  public cantidad_actual!: number;
  public stock_minimo!: number;
  public ultimo_movimiento!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public producto?: Product;
  public sede?: Sede;
  public almacen?: Almacen;
}

StockPorSede.init(
  {
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
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    stock_minimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    ultimo_movimiento: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'stock_por_sede',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['producto_id', 'sede_id', 'almacen_id']
      },
      {
        fields: ['producto_id']
      },
      {
        fields: ['sede_id']
      },
      {
        fields: ['almacen_id']
      },
      {
        fields: ['cantidad_actual']
      }
    ]
  }
);

// Definir relaciones
StockPorSede.belongsTo(Product, { foreignKey: 'producto_id', as: 'producto' });
StockPorSede.belongsTo(Sede, { foreignKey: 'sede_id', as: 'sede' });
StockPorSede.belongsTo(Almacen, { foreignKey: 'almacen_id', as: 'almacen' });

export default StockPorSede;
