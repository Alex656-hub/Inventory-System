"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySale = exports.Product = exports.Supplier = exports.Category = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Category extends sequelize_1.Model {
}
exports.Category = Category;
class Supplier extends sequelize_1.Model {
}
exports.Supplier = Supplier;
class Product extends sequelize_1.Model {
}
exports.Product = Product;
class DailySale extends sequelize_1.Model {
}
exports.DailySale = DailySale;
// Initialize models
Category.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'categories',
    timestamps: true,
    underscored: true,
});
Supplier.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'suppliers',
    timestamps: true,
    underscored: true,
});
Product.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    sku: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
    },
    categoryId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'category_id',
        references: {
            model: Category,
            key: 'id',
        },
    },
    supplierId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'supplier_id',
        references: {
            model: Supplier,
            key: 'id',
        },
    },
    costPrice: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'cost_price',
    },
    sellingPrice: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'selling_price',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'products',
    timestamps: true,
    underscored: true,
});
DailySale.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    productId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
        references: {
            model: Product,
            key: 'id',
        },
    },
    quantity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    unitPrice: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'unit_price',
    },
    totalAmount: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'total_amount',
    },
    costPrice: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'cost_price',
    },
    profit: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
}, {
    sequelize: database_1.sequelize,
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
});
// Define associations
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(Product, { foreignKey: 'supplierId' });
DailySale.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(DailySale, { foreignKey: 'productId' });
exports.default = {
    Category,
    Supplier,
    Product,
    DailySale,
};
