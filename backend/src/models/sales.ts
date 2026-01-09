import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CategoryAttributes {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplierAttributes {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductAttributes {
  id: number;
  sku: string;
  name: string;
  categoryId: number;
  supplierId: number;
  costPrice: number;
  sellingPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
  category?: CategoryAttributes;
  supplier?: SupplierAttributes;
}

export interface DailySaleAttributes {
  id?: number; // Hacer el id opcional para permitir la creación sin ID
  date: Date;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  costPrice: number;
  profit: number;
  createdAt?: Date;
  updatedAt?: Date;
  product?: ProductAttributes;
}

class Category extends Model<CategoryAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

class Supplier extends Model<SupplierAttributes> implements SupplierAttributes {
  public id!: number;
  public name!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
  public id!: number;
  public sku!: string;
  public name!: string;
  public categoryId!: number;
  public supplierId!: number;
  public costPrice!: number;
  public sellingPrice!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  public readonly category?: Category;
  public readonly supplier?: Supplier;
}

class DailySale extends Model<DailySaleAttributes> implements DailySaleAttributes {
  public id!: number;
  public date!: Date;
  public productId!: number;
  public quantity!: number;
  public unitPrice!: number;
  public totalAmount!: number;
  public costPrice!: number;
  public profit!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  public readonly product?: Product;
}

// Initialize models
Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'categories',
    timestamps: true,
    underscored: true,
  }
);

Supplier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'suppliers',
    timestamps: true,
    underscored: true,
  }
);

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: Category,
        key: 'id',
      },
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'supplier_id',
      references: {
        model: Supplier,
        key: 'id',
      },
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'cost_price',
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'selling_price',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
    underscored: true,
  }
);

DailySale.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: {
        model: Product,
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'cost_price',
    },
    profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'daily_sales',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['date', 'product_id'],
        name: 'daily_sales_date_product_id_unique',
      },
    ],
  }
);

// Define associations
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

Product.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(Product, { foreignKey: 'supplierId' });

DailySale.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(DailySale, { foreignKey: 'productId' });

export { Category, Supplier, Product, DailySale };

export default {
  Category,
  Supplier,
  Product,
  DailySale,
};
