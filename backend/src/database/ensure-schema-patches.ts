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
