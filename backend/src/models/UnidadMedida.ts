import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UnidadMedidaAttributes {
  id: number;
  nombre: string;
  abreviatura: string;
  estado: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UnidadMedidaCreationAttributes extends Optional<UnidadMedidaAttributes, 'id' | 'estado' | 'createdAt' | 'updatedAt'> {}

class UnidadMedida extends Model<UnidadMedidaAttributes, UnidadMedidaCreationAttributes> implements UnidadMedidaAttributes {
  public id!: number;
  public nombre!: string;
  public abreviatura!: string;
  public estado!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UnidadMedida.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    abreviatura: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'unidades_medida',
    timestamps: true
  }
);

export default UnidadMedida;
