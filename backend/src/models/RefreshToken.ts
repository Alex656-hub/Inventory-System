import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface RefreshTokenAttributes {
  id: number;
  token: string;
  userId: number;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'id' | 'isRevoked' | 'createdAt' | 'updatedAt'> {}

class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
  public id!: number;
  public token!: string;
  public userId!: number;
  public expiresAt!: Date;
  public isRevoked!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Método para verificar si el token ha expirado
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Método para verificar si el token es válido
  public isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }

  // Asociación con User
  public user?: User;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true,
  }
);

// Configurar asociaciones
RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens'
});

export default RefreshToken;
