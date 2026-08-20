import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import Category from './Category';
import User from './User';

export type FuenteDescuento = 'recomendacion' | 'masivo' | 'manual';

interface DescuentoAttributes {
  id: number;
  porcentaje: number;
  fecha_inicio: Date;
  fecha_fin?: Date | null;
  fuente: FuenteDescuento;
  producto_id?: number | null;
  categoria_id?: number | null;
  todos_productos: boolean;
  recomendacion_id?: number | null;
  creado_por?: number | null;
  productos_excluidos?: number[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DescuentoCreationAttributes extends Optional<DescuentoAttributes, 'id' | 'fecha_inicio' | 'todos_productos' | 'recomendacion_id' | 'creado_por' | 'productos_excluidos' | 'createdAt' | 'updatedAt'> {}

class Descuento extends Model<DescuentoAttributes, DescuentoCreationAttributes> implements DescuentoAttributes {
  public id!: number;
  public porcentaje!: number;
  public fecha_inicio!: Date;
  public fecha_fin?: Date | null;
  public fuente!: FuenteDescuento;
  public producto_id?: number | null;
  public categoria_id?: number | null;
  public todos_productos!: boolean;
  public recomendacion_id?: number | null;
  public creado_por?: number | null;
  public productos_excluidos?: number[] | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public producto?: Product;
  public categoria?: Category;
  public creador?: User;
}

Descuento.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    fuente: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'manual',
      validate: {
        isIn: [['recomendacion', 'masivo', 'manual']]
      }
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'productos',
        key: 'id'
      }
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categorias',
        key: 'id'
      }
    },
    todos_productos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recomendacion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'recomendaciones',
        key: 'id'
      }
    },
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    productos_excluidos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    }
  },
  {
    sequelize,
    tableName: 'descuentos',
    timestamps: true,
    indexes: [
      {
        fields: ['producto_id']
      },
      {
        fields: ['categoria_id']
      },
      {
        fields: ['fuente']
      },
      {
        fields: ['fecha_fin']
      }
    ]
  }
);

// Definir relaciones
Descuento.belongsTo(Product, { foreignKey: 'producto_id', as: 'producto' });
Descuento.belongsTo(Category, { foreignKey: 'categoria_id', as: 'categoria' });
Descuento.belongsTo(User, { foreignKey: 'creado_por', as: 'creador' });

export default Descuento;