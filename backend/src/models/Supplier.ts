import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SupplierAttributes {
  id: number;
  nombre: string;
  ruc_dni: string;
  contacto_telefono?: string;
  contacto_email?: string;
  direccion?: string;
  condiciones_pago?: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SupplierCreationAttributes extends Optional<SupplierAttributes, 'id' | 'activo' | 'createdAt' | 'updatedAt'> {}

class Supplier extends Model<SupplierAttributes, SupplierCreationAttributes> implements SupplierAttributes {
  public id!: number;
  public nombre!: string;
  public ruc_dni!: string;
  public contacto_telefono?: string;
  public contacto_email?: string;
  public direccion?: string;
  public condiciones_pago?: string;
  public activo!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Supplier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    ruc_dni: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    contacto_telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    contacto_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    direccion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    condiciones_pago: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'proveedores',
    timestamps: true
  }
);

export default Supplier;

