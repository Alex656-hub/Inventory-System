import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import SalidaInventario from './SalidaInventario';
import OperacionStock from './OperacionStock';

interface CuotaPagoAttributes {
  id: number;
  salida_id?: number | null;
  operacion_id?: number | null;
  numero_cuota: number;
  monto_capital: number;
  monto_interes: number;
  monto_total: number;
  fecha_vencimiento: Date;
  estado: 'pendiente' | 'pagada' | 'atrasada';
  fecha_pago?: Date | null;
  observaciones?: string | null;
  garantia_tipo: 'dni' | 'telefono' | 'ninguna';
  garantia_valor: string;
  aval_nombre?: string | null;
  aval_contacto?: string | null;
  aval_direccion?: string | null;
  responsable_cobro?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CuotaPagoCreationAttributes extends Optional<CuotaPagoAttributes, 'id' | 'salida_id' | 'operacion_id' | 'fecha_pago' | 'observaciones' | 'aval_nombre' | 'aval_contacto' | 'aval_direccion' | 'responsable_cobro' | 'createdAt' | 'updatedAt' | 'garantia_valor' | 'garantia_tipo'> {}

class CuotaPago extends Model<CuotaPagoAttributes, CuotaPagoCreationAttributes> implements CuotaPagoAttributes {
  public id!: number;
  public salida_id!: number | null;
  public operacion_id?: number | null;
  public numero_cuota!: number;
  public monto_capital!: number;
  public monto_interes!: number;
  public monto_total!: number;
  public fecha_vencimiento!: Date;
  public estado!: 'pendiente' | 'pagada' | 'atrasada';
  public fecha_pago?: Date | null;
  public observaciones?: string | null;
  public garantia_tipo!: 'dni' | 'telefono' | 'ninguna';
  public garantia_valor!: string;
  public aval_nombre?: string | null;
  public aval_contacto?: string | null;
  public aval_direccion?: string | null;
  public responsable_cobro?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public salida?: SalidaInventario;
  public operacion?: OperacionStock;
}

CuotaPago.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    salida_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'salidas_inventario',
        key: 'id',
      },
    },
    operacion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'operaciones_stock',
        key: 'id',
      },
    },
    numero_cuota: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    monto_capital: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    monto_interes: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    monto_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'pagada', 'atrasada'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    fecha_pago: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
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
    tableName: 'cuotas_pago',
    timestamps: true,
    indexes: [
      {
        fields: ['salida_id'],
      },
      {
        fields: ['operacion_id'],
      },
      {
        fields: ['estado', 'fecha_vencimiento'],
      },
      {
        fields: ['fecha_vencimiento'],
      },
    ],
  }
);

CuotaPago.belongsTo(SalidaInventario, { foreignKey: 'salida_id', as: 'salida' });
CuotaPago.belongsTo(OperacionStock, { foreignKey: 'operacion_id', as: 'operacion' });

export default CuotaPago;