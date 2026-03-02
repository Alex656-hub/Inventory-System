import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Category from './Category';
import Supplier from './Supplier';

interface ProductAttributes {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_id: number;
  proveedor_id: number;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  ubicacion?: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'activo' | 'createdAt' | 'updatedAt'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public codigo!: string;
  public nombre!: string;
  public descripcion?: string;
  public categoria_id!: number;
  public proveedor_id!: number;
  public precio_compra!: number;
  public precio_venta!: number;
  public stock_actual!: number;
  public stock_minimo!: number;
  public ubicacion?: string;
  public activo!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public categoria?: Category;
  public proveedor?: Supplier;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categorias',
        key: 'id'
      }
    },
    proveedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
    precio_compra: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    precio_venta: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    stock_actual: {
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
    ubicacion: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'productos',
    timestamps: true,
    indexes: [
      {
        fields: ['codigo']
      },
      {
        fields: ['categoria_id']
      },
      {
        fields: ['proveedor_id']
      }
    ]
  }
);

// Definir relaciones
Product.belongsTo(Category, { foreignKey: 'categoria_id', as: 'categoria' });
Product.belongsTo(Supplier, { foreignKey: 'proveedor_id', as: 'proveedor' });

export default Product;

