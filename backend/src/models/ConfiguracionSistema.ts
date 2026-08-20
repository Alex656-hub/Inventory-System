import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ConfiguracionSistemaAttributes {
  id: number;
  ruc: string;
  direccion: string;
  logo?: string; // Base64 o ruta del archivo
  logo_filename?: string;
  umbral_liquidez: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConfiguracionSistemaCreationAttributes extends Optional<ConfiguracionSistemaAttributes, 'id' | 'logo' | 'logo_filename' | 'createdAt' | 'updatedAt'> {}

class ConfiguracionSistema extends Model<ConfiguracionSistemaAttributes, ConfiguracionSistemaCreationAttributes> implements ConfiguracionSistemaAttributes {
  public id!: number;
  public ruc!: string;
  public direccion!: string;
  public logo?: string;
  public logo_filename?: string;
  public umbral_liquidez!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ConfiguracionSistema.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ruc: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '',
    },
    direccion: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    logo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Logo en base64 o ruta del archivo',
    },
    logo_filename: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nombre original del archivo del logo',
    },
    umbral_liquidez: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 10000,
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: 'ConfiguracionSistema',
    tableName: 'configuracion_sistemas',
    timestamps: true,
  }
);

export default ConfiguracionSistema;
