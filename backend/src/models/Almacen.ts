import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AlmacenAttributes {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'principal' | 'secundario' | 'temporal' | 'virtual';
  capacidad?: number;
  unidad_capacidad?: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: Date;
  updatedAt?: Date;
}

interface AlmacenCreationAttributes extends Optional<AlmacenAttributes, 'id' | 'capacidad' | 'unidad_capacidad' | 'descripcion' | 'estado' | 'createdAt' | 'updatedAt'> {}

class Almacen extends Model<AlmacenAttributes, AlmacenCreationAttributes> implements AlmacenAttributes {
  public id!: number;
  public nombre!: string;
  public codigo!: string;
  public tipo!: 'principal' | 'secundario' | 'temporal' | 'virtual';
  public capacidad?: number;
  public unidad_capacidad?: string;
  public descripcion?: string;
  public estado!: 'activo' | 'inactivo';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Almacen.init(
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
          msg: 'El nombre del almacén es requerido'
        },
        len: {
          args: [3, 200],
          msg: 'El nombre debe tener entre 3 y 200 caracteres'
        }
      }
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'El código del almacén es requerido'
        },
        len: {
          args: [2, 50],
          msg: 'El código debe tener entre 2 y 50 caracteres'
        }
      }
    },
    tipo: {
      type: DataTypes.ENUM('principal', 'secundario', 'temporal', 'virtual'),
      allowNull: false,
      defaultValue: 'secundario',
      validate: {
        isIn: {
          args: [['principal', 'secundario', 'temporal', 'virtual']],
          msg: 'El tipo de almacén debe ser: principal, secundario, temporal o virtual'
        }
      }
    },
    capacidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'La capacidad debe ser mayor o igual a 0'
        }
      }
    },
    unidad_capacidad: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: {
          args: [['m2', 'm3', 'kg', 'ton', 'litros', 'unidades']],
          msg: 'La unidad de capacidad debe ser: m2, m3, kg, ton, litros o unidades'
        }
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'La descripción no puede exceder 1000 caracteres'
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
    tableName: 'almacenes',
    timestamps: true,
    indexes: [
      {
        fields: ['nombre']
      },
      {
        fields: ['codigo']
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

export default Almacen;
