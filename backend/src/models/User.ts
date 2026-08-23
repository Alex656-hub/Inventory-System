// backend/src/models/User.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { randomInt } from 'crypto';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

export interface Permisos {
  dashboard: boolean;
  catalogoProductos: boolean;
  operacionesStock: boolean;
  historialKardex: boolean;
  reporteInventario: boolean;
  alertasStock: boolean;
  clientes: boolean;
  sedesAlmacenes: boolean;
  proveedores: boolean;
  unidades: boolean;
  personal: boolean;
  categorias: boolean;
  usuariosAccesos: boolean;
  ajustes: boolean;
}

export const PERMISOS_DEFAULT: Permisos = {
  dashboard: false,
  catalogoProductos: false,
  operacionesStock: false,
  historialKardex: false,
  reporteInventario: false,
  alertasStock: false,
  clientes: false,
  sedesAlmacenes: false,
  proveedores: false,
  unidades: false,
  personal: false,
  categorias: false,
  usuariosAccesos: false,
  ajustes: false,
};

interface UserAttributes {
  id: number;
  usuario: string;
  nombre: string;
  email: string;
  password: string;
  rol: 'gerente' | 'empleado';
  activo: boolean;
  permisos: Permisos;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  backupCodes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'activo' | 'permisos' | 'twoFactorEnabled' | 'twoFactorSecret' | 'backupCodes' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public usuario!: string;
  public nombre!: string;
  public email!: string;
  public password!: string;
  public rol!: 'gerente' | 'empleado';
  public activo!: boolean;
  public permisos!: Permisos;
  public twoFactorEnabled!: boolean;
  public twoFactorSecret?: string | null;
  public backupCodes?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Método para verificar contraseña
  public async verificarPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Nuevo método para verificar códigos 2FA
  // Nota: no valida twoFactorEnabled; los llamadores ya validan el estado
  // (necesario para /2fa/verificar, donde el flag aún es false durante la activación)
  public async verificarCodigo2FA(token: string): Promise<boolean> {
    if (!this.twoFactorSecret) {
      return false;
    }
    
    const speakeasy = require('speakeasy');
    const normalized = String(token || '').trim();
    return speakeasy.totp.verify({
      secret: this.twoFactorSecret,
      encoding: 'base32',
      token: normalized,
      window: 1 // Permite códigos del paso de tiempo anterior y siguiente
    });
  }

  // Método para generar códigos de respaldo (criptográficamente seguros)
  public generarCodigosRespaldo(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const n = randomInt(0, 36 ** 6);
      codes.push(n.toString(36).toUpperCase().padStart(6, '0'));
    }
    this.backupCodes = JSON.stringify(codes);
    return codes;
  }

  // Método para verificar códigos de respaldo (insensible a mayúsculas/espacios)
  public verificarCodigoRespaldo(token: string): boolean {
    if (!this.backupCodes) return false;
    
    const codes = JSON.parse(this.backupCodes) as string[];
    const normalized = String(token || '').trim().toUpperCase();
    const index = codes.indexOf(normalized);
    
    if (index !== -1) {
      // Eliminar el código usado
      codes.splice(index, 1);
      this.backupCodes = JSON.stringify(codes);
      return true;
    }
    
    return false;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    usuario: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    rol: {
      type: DataTypes.ENUM('gerente', 'empleado'),
      allowNull: false,
      defaultValue: 'empleado'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    permisos: {
      type: DataTypes.JSONB,
      defaultValue: { ...PERMISOS_DEFAULT }
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    backupCodes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'usuarios',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  }
);

export default User;