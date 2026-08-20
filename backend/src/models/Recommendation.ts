import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './Product';
import Alert from './Alert';
import User from './User';
import Supplier from './Supplier';

interface RecommendationAttributes {
  id: number;
  alert_id?: number;
  product_id: number;
  proveedor_id?: number;
  tipo: 'REORDEN' | 'PROMOCION' | 'INVESTIGAR' | 'DESCARTAR' | 'AJUSTE';
  prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
  titulo: string;
  descripcion: string;
  cantidad_sugerida: number | null;
  costo_estimado: number | null;
  impacto_estimado: number | null;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'EJECUTADA';
  user_id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RecommendationCreationAttributes extends Optional<RecommendationAttributes, 'id' | 'alert_id' | 'proveedor_id' | 'cantidad_sugerida' | 'costo_estimado' | 'impacto_estimado' | 'createdAt' | 'updatedAt'> {}

class Recommendation extends Model<RecommendationAttributes, RecommendationCreationAttributes> implements RecommendationAttributes {
  public id!: number;
  public alert_id?: number;
  public product_id!: number;
  public proveedor_id?: number;
  public tipo!: 'REORDEN' | 'PROMOCION' | 'INVESTIGAR' | 'DESCARTAR' | 'AJUSTE';
  public prioridad!: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA';
  public titulo!: string;
  public descripcion!: string;
  public cantidad_sugerida!: number | null;
  public costo_estimado!: number | null;
  public impacto_estimado!: number | null;
  public estado!: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'EJECUTADA';
  public user_id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relaciones
  public alert?: Alert;
  public product?: Product;
  public user?: User;
  public supplier?: Supplier;
}

Recommendation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    alert_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'alertas',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'productos',
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
    tipo: {
      type: DataTypes.ENUM('REORDEN', 'PROMOCION', 'INVESTIGAR', 'DESCARTAR', 'AJUSTE'),
      allowNull: false
    },
    prioridad: {
      type: DataTypes.ENUM('URGENTE', 'ALTA', 'MEDIA', 'BAJA'),
      allowNull: false
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cantidad_sugerida: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    costo_estimado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    impacto_estimado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'EJECUTADA'),
      allowNull: false,
      defaultValue: 'PENDIENTE'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    tableName: 'recomendaciones',
    timestamps: true
  }
);

// Definir relaciones
Recommendation.belongsTo(Alert, { foreignKey: 'alert_id', as: 'alert' });
Recommendation.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Recommendation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Recommendation.belongsTo(Supplier, { foreignKey: 'proveedor_id', as: 'supplier' });

export default Recommendation;
