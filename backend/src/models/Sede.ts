import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SedeAttributes {
  id: number;
  nombre: string;
  tipo: 'tienda' | 'almacen' | 'oficina' | 'bodega';
  direccion: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: Date;
  updatedAt?: Date;
}

interface SedeCreationAttributes extends Optional<SedeAttributes, 'id' | 'telefono' | 'email' | 'responsable' | 'estado' | 'createdAt' | 'updatedAt'> {}

class Sede extends Model<SedeAttributes, SedeCreationAttributes> implements SedeAttributes {
  public id!: number;
  public nombre!: string;
  public tipo!: 'tienda' | 'almacen' | 'oficina' | 'bodega';
  public direccion!: string;
  public telefono?: string;
  public email?: string;
  public responsable?: string;
  public estado!: 'activo' | 'inactivo';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Sede.init(
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
          msg: 'El nombre de la sede es requerido'
        },
        len: {
          args: [3, 200],
          msg: 'El nombre debe tener entre 3 y 200 caracteres'
        }
      }
    },
    tipo: {
      type: DataTypes.ENUM('tienda', 'almacen', 'oficina', 'bodega'),
      allowNull: false,
      defaultValue: 'tienda',
      validate: {
        isIn: {
          args: [['tienda', 'almacen', 'oficina', 'bodega']],
          msg: 'El tipo de sede debe ser: tienda, almacen, oficina o bodega'
        }
      }
    },
    direccion: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La dirección es requerida'
        },
        len: {
          args: [5, 500],
          msg: 'La dirección debe tener entre 5 y 500 caracteres'
        }
      }
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
    responsable: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [3, 100],
          msg: 'El nombre del responsable debe tener entre 3 y 100 caracteres'
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
    tableName: 'sedes',
    timestamps: true,
    indexes: [
      {
        fields: ['nombre']
      },
      {
        fields: ['tipo']
      },
      {
        fields: ['estado']
      }
    ]
  }
);

export default Sede;
