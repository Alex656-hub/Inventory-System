import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Crear tabla de clientes
  await queryInterface.createTable('clientes', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    tipo_documento: {
      type: DataTypes.ENUM('DNI', 'RUC', 'PASAPORTE', 'OTRO'),
      allowNull: false,
      defaultValue: 'DNI'
    },
    numero_documento: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    direccion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Crear índices para clientes
  await queryInterface.addIndex('clientes', ['nombre']);
  await queryInterface.addIndex('clientes', ['numero_documento']);
  await queryInterface.addIndex('clientes', ['tipo_documento']);
  await queryInterface.addIndex('clientes', ['estado']);

  // Crear tabla de operaciones de stock
  await queryInterface.createTable('operaciones_stock', {
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
      allowNull: false
    },
    responsable_fisico_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
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
    total_unidades: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    costo_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    estado: {
      type: DataTypes.ENUM('BORRADOR', 'PROCESADO', 'CANCELADO'),
      allowNull: false,
      defaultValue: 'BORRADOR'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  // Crear índices para operaciones_stock
  await queryInterface.addIndex('operaciones_stock', ['tipo_operacion']);
  await queryInterface.addIndex('operaciones_stock', ['fecha_emision']);
  await queryInterface.addIndex('operaciones_stock', ['responsable_fisico_id']);
  await queryInterface.addIndex('operaciones_stock', ['estado']);
  await queryInterface.addIndex('operaciones_stock', ['sede_origen_id']);
  await queryInterface.addIndex('operaciones_stock', ['sede_destino_id']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Eliminar tabla operaciones_stock
  await queryInterface.dropTable('operaciones_stock');
  
  // Eliminar tabla clientes
  await queryInterface.dropTable('clientes');
}
