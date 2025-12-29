// backend/src/models/User.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: number;
  nombre: string;
  email: string;
  password: string;
  rol: 'gerente' | 'empleado';
  activo: boolean;
  twoFactorEnabled: boolean;      // Nuevo campo
  twoFactorSecret?: string | null; // Nuevo campo
  backupCodes?: string | null;    // Nuevo campo
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'activo' | 'twoFactorEnabled' | 'twoFactorSecret' | 'backupCodes' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public nombre!: string;
  public email!: string;
  public password!: string;
  public rol!: 'gerente' | 'empleado';
  public activo!: boolean;
  public twoFactorEnabled!: boolean;    // Nuevo campo
  public twoFactorSecret?: string | null; // Nuevo campo
  public backupCodes?: string | null;   // Nuevo campo
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Método para verificar contraseña
  public async verificarPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Nuevo método para verificar códigos 2FA
  public async verificarCodigo2FA(token: string): Promise<boolean> {
    if (!this.twoFactorEnabled || !this.twoFactorSecret) {
      return false;
    }
    
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: this.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1 // Permite códigos del paso de tiempo anterior y siguiente
    });
  }

  // Método para generar códigos de respaldo
  public generarCodigosRespaldo(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    this.backupCodes = JSON.stringify(codes);
    return codes;
  }

  // Método para verificar códigos de respaldo
  public verificarCodigoRespaldo(token: string): boolean {
    if (!this.backupCodes) return false;
    
    const codes = JSON.parse(this.backupCodes);
    const index = codes.indexOf(token);
    
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
    // Nuevos campos para 2FA
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