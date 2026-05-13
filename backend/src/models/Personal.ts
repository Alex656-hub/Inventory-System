import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PersonalAttributes {
  id: number;
  nombreCompleto: string;
  cargo: 'Almacenero' | 'Repartidor';
  telefono?: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PersonalCreationAttributes extends Optional<PersonalAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Personal extends Model<PersonalAttributes, PersonalCreationAttributes> implements PersonalAttributes {
  public id!: number;
  public nombreCompleto!: string;
  public cargo!: 'Almacenero' | 'Repartidor';
  public telefono?: string;
  public activo!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Personal.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombreCompleto: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre completo es requerido'
        },
        len: {
          args: [3, 200],
          msg: 'El nombre completo debe tener entre 3 y 200 caracteres'
        }
      }
    },
    cargo: {
      type: DataTypes.ENUM('Almacenero', 'Repartidor'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El cargo es requerido'
        }
      }
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: [/^[0-9+\-\s()]*$/],
          msg: 'El teléfono debe contener solo números y caracteres válidos'
        }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'personal',
    timestamps: true
  }
);

export default Personal;
