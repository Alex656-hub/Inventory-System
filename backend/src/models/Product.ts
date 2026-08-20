import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Category from './Category';
import Supplier from './Supplier';
import UnidadMedida from './UnidadMedida';

interface ProductAttributes {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_id: number;
  proveedor_id?: number;
  unidad_id?: number;
  precio_compra: number;
  precio_venta: number;
  descuento_promocion?: number;
  promocion_hasta?: Date | null;
  stock_actual: number;
  stock_minimo: number;
  ubicacion?: string;
  activo: boolean;
  image_filename?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'activo' | 'createdAt' | 'updatedAt' | 'proveedor_id' | 'unidad_id' | 'image_filename' | 'descuento_promocion' | 'promocion_hasta'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public codigo!: string;
  public nombre!: string;
  public descripcion?: string;
  public categoria_id!: number;
  public proveedor_id?: number;
  public unidad_id?: number;
  public precio_compra!: number;
  public precio_venta!: number;
  public descuento_promocion?: number;
  public promocion_hasta?: Date | null;
  public stock_actual!: number;
  public stock_minimo!: number;
  public ubicacion?: string;
  public activo!: boolean;
  public image_filename?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public categoria?: Category;
  public proveedor?: Supplier;
  public unidad?: UnidadMedida;
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
      allowNull: true,
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
    unidad_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'unidades_medida',
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
    descuento_promocion: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    promocion_hasta: {
      type: DataTypes.DATE,
      allowNull: true
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
    },
    image_filename: {
      type: DataTypes.STRING(255),
      allowNull: true
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
      },
      {
        fields: ['unidad_id']
      }
    ]
  }
);

// Definir relaciones
Product.belongsTo(Category, { foreignKey: 'categoria_id', as: 'categoria' });
Product.belongsTo(Supplier, { foreignKey: 'proveedor_id', as: 'proveedor' });
Product.belongsTo(UnidadMedida, { foreignKey: 'unidad_id', as: 'unidad' });

export default Product;

