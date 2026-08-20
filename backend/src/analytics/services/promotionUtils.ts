/**
 * Utilidades compartidas de promociones/descuentos.
 * Centraliza la lógica que antes se duplicaba en ReportController,
 * ReportService, ProductList, OperacionesStock, etc.
 */

export interface PromoProduct {
  descuento_promocion?: number | string | null;
  promocion_hasta?: Date | string | null;
  precio_compra?: number | string | null;
  precio_venta?: number | string | null;
}

/**
 * Determina si una promoción está activa:
 * - descuento > 0
 * - sin fecha de fin o fecha de fin en el futuro
 */
export function esPromoActiva(producto: PromoProduct): boolean {
  const desc = Number(producto.descuento_promocion) || 0;
  if (desc <= 0) return false;
  if (producto.promocion_hasta) {
    const fin = new Date(producto.promocion_hasta);
    if (isNaN(fin.getTime()) || fin < new Date()) return false;
  }
  return true;
}

/**
 * Precio de venta con promoción aplicada, o null si no hay promo activa.
 */
export function calcularPrecioPromo(producto: PromoProduct): number | null {
  if (!esPromoActiva(producto)) return null;
  const desc = Number(producto.descuento_promocion) || 0;
  return parseFloat(((Number(producto.precio_venta) || 0) * (1 - desc / 100)).toFixed(2));
}

/**
 * Margen de ganancia porcentual sobre el precio de venta:
 * (1 - precio_compra / precio_venta) * 100
 */
export function calcularMargenPorcentaje(precioCompra: number | string | null | undefined, precioVenta: number | string | null | undefined): number {
  const compra = Number(precioCompra) || 0;
  const venta = Number(precioVenta) || 0;
  if (venta <= 0) return 0;
  return parseFloat(((1 - compra / venta) * 100).toFixed(2));
}