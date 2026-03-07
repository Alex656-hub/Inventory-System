import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface CategoryAttributes {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'activa' | 'createdAt' | 'updatedAt'> {}

class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public nombre!: string;
  public descripcion?: string;
  public activa!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'categorias',
    timestamps: true
  }
);

export default Category;

