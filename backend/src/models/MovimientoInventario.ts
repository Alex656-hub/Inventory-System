import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import User from './User';

interface MovimientoInventarioAttributes {
  id: number;
  producto_id: number;
  tipo_movimiento: string; // 'entrada', 'salida', 'ajuste'
  referencia_id?: number; // ID de entrada o salida
  tipo_referencia?: string; // 'compra', 'venta', 'ajuste'
  cantidad: number;
  precio_unitario: number;
  stock_anterior: number;
  stock_nuevo: number;
  usuario_id: number;
  fecha: Date;
  motivo?: string;
  observaciones?: string;
  sede_origen?: string;  // Nombre de la sede origen (para importaciones)
  sede_destino?: string; // Nombre de la sede destino (para importaciones)
  responsable?: string;  // Nombre del responsable (para importaciones)
  createdAt?: Date;
  updatedAt?: Date;
}

interface MovimientoInventarioCreationAttributes extends Optional<MovimientoInventarioAttributes, 'id' | 'createdAt' | 'updatedAt' | 'fecha'> {}

class MovimientoInventario extends Model<MovimientoInventarioAttributes, MovimientoInventarioCreationAttributes> implements MovimientoInventarioAttributes {
  public id!: number;
  public producto_id!: number;
  public tipo_movimiento!: string;
  public referencia_id?: number;
  public tipo_referencia?: string;
  public cantidad!: number;
  public precio_unitario!: number;
  public stock_anterior!: number;
  public stock_nuevo!: number;
  public usuario_id!: number;
  public fecha!: Date;
  public motivo?: string;
  public observaciones?: string;
  public sede_origen?: string;
  public sede_destino?: string;
  public responsable?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public producto?: Product;
  public usuario?: User;
}

MovimientoInventario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos',
        key: 'id'
      }
    },
    tipo_movimiento: {
      type: DataTypes.ENUM('entrada', 'salida', 'ajuste'),
      allowNull: false
    },
    referencia_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_referencia: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    stock_anterior: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stock_nuevo: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    motivo: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sede_origen: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    sede_destino: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    responsable: {
      type: DataTypes.STRING(200),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'movimientos_inventario',
    timestamps: true,
    indexes: [
      {
        fields: ['producto_id']
      },
      {
        fields: ['fecha']
      },
      {
        fields: ['tipo_movimiento']
      },
      {
        fields: ['usuario_id']
      }
    ]
  }
);

// Definir relaciones
MovimientoInventario.belongsTo(Product, { foreignKey: 'producto_id', as: 'producto' });
MovimientoInventario.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

export default MovimientoInventario;

