import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Supplier from './Supplier';
import User from './User';

interface EntradaInventarioAttributes {
  id: number;
  numero_documento: string;
  fecha: Date;
  proveedor_id: number;
  usuario_id: number;
  tipo_documento: string; // 'factura', 'boleta', 'ticket', etc.
  numero_serie?: string;
  total: number;
  forma_pago: string; // 'contado', 'credito'
  estado: string; // 'pendiente', 'pagado', 'cancelado'
  observaciones?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EntradaInventarioCreationAttributes extends Optional<EntradaInventarioAttributes, 'id' | 'estado' | 'createdAt' | 'updatedAt'> {}

class EntradaInventario extends Model<EntradaInventarioAttributes, EntradaInventarioCreationAttributes> implements EntradaInventarioAttributes {
  public id!: number;
  public numero_documento!: string;
  public fecha!: Date;
  public proveedor_id!: number;
  public usuario_id!: number;
  public tipo_documento!: string;
  public numero_serie?: string;
  public total!: number;
  public forma_pago!: string;
  public estado!: string;
  public observaciones?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public proveedor?: Supplier;
  public usuario?: User;
}

EntradaInventario.init(
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
    proveedor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'proveedores',
        key: 'id'
      }
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
      defaultValue: 'factura'
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
    forma_pago: {
      type: DataTypes.ENUM('contado', 'credito'),
      allowNull: false,
      defaultValue: 'contado'
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'pagado', 'cancelado'),
      allowNull: false,
      defaultValue: 'pagado'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'entradas_inventario',
    timestamps: true,
    indexes: [
      {
        fields: ['numero_documento']
      },
      {
        fields: ['proveedor_id']
      },
      {
        fields: ['fecha']
      }
    ]
  }
);

// Definir relaciones (hasMany se define después de que DetalleEntrada esté cargado)
EntradaInventario.belongsTo(Supplier, { foreignKey: 'proveedor_id', as: 'proveedor' });
EntradaInventario.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

export default EntradaInventario;

