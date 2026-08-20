/**
 * Utilidades compartidas de promociones/descuentos (frontend).
 * Centraliza la lógica duplicada en ProductList, OperacionesStock, etc.
 */

export interface PromoProduct {
  descuento_promocion?: number | string | null;
  promocion_hasta?: string | null;
  precio_venta?: number | string | null;
}

/** Descuento > 0 y vigencia no vencida. */
export function esPromoActiva(producto: PromoProduct): boolean {
  const desc = Number(producto.descuento_promocion) || 0;
  if (desc <= 0) return false;
  if (producto.promocion_hasta) {
    const fin = new Date(producto.promocion_hasta);
    if (isNaN(fin.getTime()) || fin < new Date()) return false;
  }
  return true;
}

/** Precio de venta con promo aplicada, o null si no hay promo activa. */
export function calcularPrecioPromo(producto: PromoProduct): number | null {
  if (!esPromoActiva(producto)) return null;
  const desc = Number(producto.descuento_promocion) || 0;
  return parseFloat(((Number(producto.precio_venta) || 0) * (1 - desc / 100)).toFixed(2));
}

export const FUENTE_LABEL: Record<string, string> = {
  recomendacion: 'Recomendación',
  masivo: 'Masivo',
  manual: 'Manual',
  legacy: 'Manual'
};