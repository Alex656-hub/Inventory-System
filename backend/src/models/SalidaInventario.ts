import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

interface SalidaInventarioAttributes {
  id: number;
  numero_documento: string;
  fecha: Date;
  cliente_nombre?: string;
  cliente_documento?: string;
  usuario_id: number;
  tipo_documento: string; // 'boleta', 'factura', 'ticket'
  numero_serie?: string;
  total: number;
  metodo_pago: string; // 'efectivo', 'credito', 'tarjeta'
  estado: string; // 'completado', 'cancelado'
  observaciones?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SalidaInventarioCreationAttributes extends Optional<SalidaInventarioAttributes, 'id' | 'estado' | 'createdAt' | 'updatedAt'> {}

class SalidaInventario extends Model<SalidaInventarioAttributes, SalidaInventarioCreationAttributes> implements SalidaInventarioAttributes {
  public id!: number;
  public numero_documento!: string;
  public fecha!: Date;
  public cliente_nombre?: string;
  public cliente_documento?: string;
  public usuario_id!: number;
  public tipo_documento!: string;
  public numero_serie?: string;
  public total!: number;
  public metodo_pago!: string;
  public estado!: string;
  public observaciones?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public usuario?: User;
}

SalidaInventario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    numero_documento: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    cliente_nombre: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    cliente_documento: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    tipo_documento: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'boleta'
    },
    numero_serie: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    metodo_pago: {
      type: DataTypes.ENUM('efectivo', 'credito', 'tarjeta'),
      allowNull: false,
      defaultValue: 'efectivo'
    },
    estado: {
      type: DataTypes.ENUM('completado', 'cancelado'),
      allowNull: false,
      defaultValue: 'completado'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'salidas_inventario',
    timestamps: true,
    indexes: [
      {
        fields: ['numero_documento']
      },
      {
        fields: ['fecha']
      },
      {
        fields: ['usuario_id']
      }
    ]
  }
);

// Definir relaciones (hasMany se define después de que DetalleSalida esté cargado)
SalidaInventario.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

export default SalidaInventario;

