import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ClientAttributes {
  id: number;
  nombre: string;
  tipo_documento: 'DNI' | 'RUC' | 'PASAPORTE' | 'OTRO';
  numero_documento: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClientCreationAttributes extends Optional<ClientAttributes, 'id' | 'direccion' | 'telefono' | 'email' | 'estado' | 'createdAt' | 'updatedAt'> {}

class Client extends Model<ClientAttributes, ClientCreationAttributes> implements ClientAttributes {
  public id!: number;
  public nombre!: string;
  public tipo_documento!: 'DNI' | 'RUC' | 'PASAPORTE' | 'OTRO';
  public numero_documento!: string;
  public direccion?: string;
  public telefono?: string;
  public email?: string;
  public estado!: 'activo' | 'inactivo';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Client.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre del cliente es requerido'
        },
        len: {
          args: [3, 200],
          msg: 'El nombre debe tener entre 3 y 200 caracteres'
        }
      }
    },
    tipo_documento: {
      type: DataTypes.ENUM('DNI', 'RUC', 'PASAPORTE', 'OTRO'),
      allowNull: false,
      defaultValue: 'DNI'
    },
    numero_documento: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'El número de documento es requerido'
        },
        len: {
          args: [5, 20],
          msg: 'El número de documento debe tener entre 5 y 20 caracteres'
        }
      }
    },
    direccion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: {
          args: [7, 20],
          msg: 'El teléfono debe tener entre 7 y 20 caracteres'
        }
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: {
          msg: 'El email debe ser válido'
        }
      }
    },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo'
    }
  },
  {
    sequelize,
    tableName: 'clientes',
    timestamps: true,
    indexes: [
      {
        fields: ['nombre']
      },
      {
        fields: ['numero_documento']
      },
      {
        fields: ['tipo_documento']
      },
      {
        fields: ['estado']
      }
    ]
  }
);

export default Client;
