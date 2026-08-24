import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import Sede from './Sede';
import Supplier from './Supplier';
import Personal from './Personal';
import Client from './Client';

interface OperacionStockAttributes {
  id: number;
  tipo_operacion: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  fecha_emision: Date;
  personal_id?: number;
  referencia?: string;
  
  // Campos dinámicos según tipo
  sede_origen_id?: number;        // SALIDA, TRASPASO
  sede_destino_id?: number;       // ENTRADA, TRASPASO
  proveedor_id?: number;          // ENTRADA
  cliente_id?: number;            // SALIDA
  motivo_traspaso?: string;       // TRASPASO

  // Método de pago y ventas en cuotas (SALIDA)
  metodo_pago?: 'efectivo' | 'credito' | 'tarjeta';
  num_cuotas?: number;
  frecuencia_cuota?: 'semanal' | 'quincenal' | 'mensual' | null;
  interes_mensual?: number;
  primer_vencimiento?: Date | null;
  garantia_tipo?: 'dni' | 'telefono' | 'ninguna';
  garantia_valor?: string;
  aval_nombre?: string | null;
  aval_contacto?: string | null;
  aval_direccion?: string | null;
  responsable_cobro?: string | null;
  
  // Totales
  total_unidades: number;
  costo_total: number;
  
  // PDF storage
  pdf_html?: string;              // HTML del PDF generado al procesar
  
  estado: 'BORRADOR' | 'PROCESADO' | 'CANCELADO';
  createdAt?: Date;
  updatedAt?: Date;
}

interface OperacionStockCreationAttributes extends Optional<OperacionStockAttributes, 'id' | 'referencia' | 'sede_origen_id' | 'sede_destino_id' | 'proveedor_id' | 'cliente_id' | 'motivo_traspaso' | 'personal_id' | 'createdAt' | 'updatedAt'> {}

class OperacionStock extends Model<OperacionStockAttributes, OperacionStockCreationAttributes> implements OperacionStockAttributes {
  public id!: number;
  public tipo_operacion!: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  public fecha_emision!: Date;
  public personal_id!: number;
  public referencia?: string;
  public sede_origen_id?: number;
  public sede_destino_id?: number;
  public proveedor_id?: number;
  public cliente_id?: number;
  public motivo_traspaso?: string;
  public metodo_pago?: 'efectivo' | 'credito' | 'tarjeta';
  public num_cuotas?: number;
  public frecuencia_cuota?: 'semanal' | 'quincenal' | 'mensual' | null;
  public interes_mensual?: number;
  public primer_vencimiento?: Date | null;
  public garantia_tipo?: 'dni' | 'telefono' | 'ninguna';
  public garantia_valor?: string;
  public aval_nombre?: string | null;
  public aval_contacto?: string | null;
  public aval_direccion?: string | null;
  public responsable_cobro?: string | null;
  public total_unidades!: number;
  public costo_total!: number;
  public pdf_html?: string;
  public estado!: 'BORRADOR' | 'PROCESADO' | 'CANCELADO';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public personal?: Personal;
  public sede_origen?: Sede;
  public sede_destino?: Sede;
  public proveedor?: Supplier;
  public cliente?: Client;
}

OperacionStock.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tipo_operacion: {
      type: DataTypes.ENUM('ENTRADA', 'SALIDA', 'TRASPASO'),
      allowNull: false
    },
    fecha_emision: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    personal_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'personal',
        key: 'id'
      }
    },
    referencia: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sede_origen_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sedes',
        key: 'id'
      }
    },
    sede_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sedes',
        key: 'id'
      }
    },
    proveedor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'proveedores',
        key: 'id'
      }
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    motivo_traspaso: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    metodo_pago: {
      type: DataTypes.ENUM('efectivo', 'credito', 'tarjeta'),
      allowNull: false,
      defaultValue: 'efectivo'
    },
    num_cuotas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    frecuencia_cuota: {
      type: DataTypes.ENUM('semanal', 'quincenal', 'mensual'),
      allowNull: true
    },
    interes_mensual: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    primer_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    garantia_tipo: {
      type: DataTypes.ENUM('dni', 'telefono', 'ninguna'),
      allowNull: false,
      defaultValue: 'ninguna'
    },
    garantia_valor: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    aval_nombre: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    aval_contacto: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    aval_direccion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responsable_cobro: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    total_unidades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    costo_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    pdf_html: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HTML del PDF generado al procesar la operación'
    },
    estado: {
      type: DataTypes.ENUM('BORRADOR', 'PROCESADO', 'CANCELADO'),
      allowNull: false,
      defaultValue: 'BORRADOR'
    }
  },
  {
    sequelize,
    tableName: 'operaciones_stock',
    timestamps: true,
    indexes: [
      {
        fields: ['tipo_operacion']
      },
      {
        fields: ['fecha_emision']
      },
      {
        fields: ['personal_id']
      },
      {
        fields: ['estado']
      },
      {
        fields: ['sede_origen_id']
      },
      {
        fields: ['sede_destino_id']
      }
    ]
  }
);

// Definir relaciones
OperacionStock.belongsTo(Personal, { foreignKey: 'personal_id', as: 'personal' });
OperacionStock.belongsTo(Sede, { foreignKey: 'sede_origen_id', as: 'sede_origen' });
OperacionStock.belongsTo(Sede, { foreignKey: 'sede_destino_id', as: 'sede_destino' });
OperacionStock.belongsTo(Supplier, { foreignKey: 'proveedor_id', as: 'proveedor' });
OperacionStock.belongsTo(Client, { foreignKey: 'cliente_id', as: 'cliente' });

export default OperacionStock;
