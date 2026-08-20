import { sequelize } from '../config/database';

/**
 * Alinea el esquema con el modelo: proveedor_id debe permitir NULL.
 * Instalaciones anteriores podían haber creado la columna como NOT NULL.
 */
export async function ensureProductosProveedorOptional(): Promise<void> {
  try {
    await sequelize.query(
      'ALTER TABLE "productos" ALTER COLUMN "proveedor_id" DROP NOT NULL;'
    );
  } catch (err) {
    console.warn(
      '⚠️ No se pudo marcar productos.proveedor_id como opcional (¿tabla aún no existe?).',
      err
    );
  }
}

/**
 * Agrega las columnas de descuento/precio lista a tablas ya existentes.
 * El sync con alter=false no añade columnas a tablas creadas antes de estos campos.
 */
export async function ensureCamposDescuento(): Promise<void> {
  const statements = [
    'ALTER TABLE "movimientos_inventario" ADD COLUMN IF NOT EXISTS "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0;',
    'ALTER TABLE "movimientos_inventario" ADD COLUMN IF NOT EXISTS "precio_lista" DECIMAL(10,2);',
    'ALTER TABLE "detalles_operacion" ADD COLUMN IF NOT EXISTS "descuento" DECIMAL(5,2) NOT NULL DEFAULT 0;',
    'ALTER TABLE "detalles_operacion" ADD COLUMN IF NOT EXISTS "precio_lista" DECIMAL(10,2);'
  ];

  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      console.warn(`⚠️ No se pudo ejecutar schema patch: ${sql}`, err);
    }
  }
}

/**
 * Agrega columnas de promoción/descuento al catálogo de productos.
 * Permiten marcar un producto individual con descuento promocional persistente.
 */
export async function ensureCamposPromocionProducto(): Promise<void> {
  const statements = [
    'ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "descuento_promocion" DECIMAL(5,2) DEFAULT 0;',
    'ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "promocion_hasta" DATE;'
  ];

  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      console.warn(`⚠️ No se pudo ejecutar schema patch: ${sql}`, err);
    }
  }
}

/**
 * Crea la tabla de descuentos (bulk por categoría/producto/todos y
 * descuentos de recomendación). No depende del sync de Sequelize para
 * entornos donde ENABLE_DB_SYNC no está activo.
 */
export async function ensureTablaDescuentos(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "descuentos" (
      "id" SERIAL PRIMARY KEY,
      "porcentaje" DECIMAL(5,2) NOT NULL,
      "fecha_inicio" DATE NOT NULL DEFAULT CURRENT_DATE,
      "fecha_fin" DATE,
      "fuente" VARCHAR(20) NOT NULL DEFAULT 'manual',
      "producto_id" INTEGER,
      "categoria_id" INTEGER,
      "todos_productos" BOOLEAN NOT NULL DEFAULT false,
      "recomendacion_id" INTEGER,
      "creado_por" INTEGER,
      "productos_excluidos" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );`,
    `ALTER TABLE "descuentos" ADD COLUMN IF NOT EXISTS "productos_excluidos" JSONB NOT NULL DEFAULT '[]'::jsonb;`,
    'CREATE INDEX IF NOT EXISTS "descuentos_producto_id" ON "descuentos" ("producto_id");',
    'CREATE INDEX IF NOT EXISTS "descuentos_categoria_id" ON "descuentos" ("categoria_id");',
    'CREATE INDEX IF NOT EXISTS "descuentos_fuente" ON "descuentos" ("fuente");',
    'CREATE INDEX IF NOT EXISTS "descuentos_fecha_fin" ON "descuentos" ("fecha_fin");'
  ];

  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      console.warn(`⚠️ No se pudo ejecutar schema patch: ${sql}`, err);
    }
  }
}
export async function ensureRecomendacionesAlertNullable(): Promise<void> {
  try {
    await sequelize.query(
      'ALTER TABLE "recomendaciones" ALTER COLUMN "alert_id" DROP NOT NULL;'
    );
  } catch (err) {
    console.warn(
      '⚠️ No se pudo marcar recomendaciones.alert_id como opcional (¿tabla aún no existe?).',
      err
    );
  }
}

/**
 * Agrega los campos de método de pago y configuración de cuotas a
 * operaciones_stock, y habilita cuotas_pago para vincularse a operaciones
 * (ventas a crédito del módulo Operaciones de Stock).
 * El sync con alter=false no añade columnas ni relaja constraints en tablas
 * existentes, por lo que se ejecutan de forma explícita.
 */
export async function ensureCamposCuotasOperacionStock(): Promise<void> {
  const statements = [
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "metodo_pago" VARCHAR(20) DEFAULT \'efectivo\';',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "num_cuotas" INTEGER DEFAULT 0;',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "frecuencia_cuota" VARCHAR(20);',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "interes_mensual" DECIMAL(5,2) DEFAULT 0;',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "primer_vencimiento" DATE;',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "garantia_tipo" VARCHAR(20) DEFAULT \'ninguna\';',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "garantia_valor" VARCHAR(100) DEFAULT \'\';',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "aval_nombre" VARCHAR(200);',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "aval_contacto" VARCHAR(100);',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "aval_direccion" TEXT;',
    'ALTER TABLE "operaciones_stock" ADD COLUMN IF NOT EXISTS "responsable_cobro" VARCHAR(200);',
    'ALTER TABLE "cuotas_pago" ADD COLUMN IF NOT EXISTS "operacion_id" INTEGER;',
    'ALTER TABLE "cuotas_pago" ALTER COLUMN "salida_id" DROP NOT NULL;'
  ];

  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      console.warn(`⚠️ No se pudo ejecutar schema patch: ${sql}`, err);
    }
  }
}
