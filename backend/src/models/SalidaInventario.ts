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
  // Campos para ventas en cuotas
  num_cuotas: number;
  frecuencia_cuota: 'semanal' | 'quincenal' | 'mensual' | null;
  interes_mensual: number;
  primer_vencimiento: Date | null;
  garantia_tipo: 'dni' | 'telefono' | 'ninguna';
  garantia_valor: string;
  aval_nombre?: string | null;
  aval_contacto?: string | null;
  aval_direccion?: string | null;
  responsable_cobro?: string | null;
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
  // Campos para ventas en cuotas
  public num_cuotas!: number;
  public frecuencia_cuota!: 'semanal' | 'quincenal' | 'mensual' | null;
  public interes_mensual!: number;
  public primer_vencimiento!: Date | null;
  public garantia_tipo!: 'dni' | 'telefono' | 'ninguna';
  public garantia_valor!: string;
  public aval_nombre?: string | null;
  public aval_contacto?: string | null;
  public aval_direccion?: string | null;
  public responsable_cobro?: string | null;
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
      allowNull: true,
    },
    // Campos para ventas en cuotas
    num_cuotas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    frecuencia_cuota: {
      type: DataTypes.ENUM('semanal', 'quincenal', 'mensual'),
      allowNull: true,
    },
    interes_mensual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    primer_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    garantia_tipo: {
      type: DataTypes.ENUM('dni', 'telefono', 'ninguna'),
      allowNull: false,
      defaultValue: 'ninguna',
    },
    garantia_valor: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
    },
    aval_nombre: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    aval_contacto: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    aval_direccion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
responsable_cobro: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
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

