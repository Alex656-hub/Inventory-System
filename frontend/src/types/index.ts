export interface Permisos {
  dashboard: boolean;
  catalogoProductos: boolean;
  operacionesStock: boolean;
  historialKardex: boolean;
  reporteInventario: boolean;
  alertasStock: boolean;
  clientes: boolean;
  sedesAlmacenes: boolean;
  proveedores: boolean;
  unidades: boolean;
  personal: boolean;
  categorias: boolean;
  usuariosAccesos: boolean;
  ajustes: boolean;
}

export interface Usuario {
  id: number;
  usuario: string;
  nombre: string;
  email: string;
  rol: 'gerente' | 'empleado';
  activo: boolean;
  permisos: Permisos;
  twoFactorEnabled?: boolean;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_id: number;
  proveedor_id?: number;
  unidad_id?: number;
  precio_compra: number;
  precio_venta: number;
  descuento_promocion?: number | null;
  promocion_hasta?: string | null;
  stock_actual: number;
  stock_minimo: number;
  ubicacion?: string;
  activo: boolean;
  imageUrl?: string | null;
  descuento_fuente?: 'recomendacion' | 'masivo' | 'manual' | 'legacy';
  categoria?: Categoria;
  proveedor?: Proveedor;
  unidad?: UnidadMedida;
  createdAt?: string;
  updatedAt?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  ruc_dni: string;
  contacto_telefono?: string;
  contacto_email?: string;
  direccion?: string;
  condiciones_pago?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
  estado: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email?: string;
  usuario?: string;
  password: string;
}

export interface LoginResponse {
  mensaje: string;
  requiere2FA: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  token?: string; // Para compatibilidad con login con 2FA
  usuario: Usuario;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// Interfaces para búsqueda global
export interface ProductoSearchResult {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: {
    id: number;
    nombre: string;
  };
  resumen: string;
}

export interface VentaSearchResult {
  id: number;
  numero: string;
  fecha: string;
  total: number;
  resumen: string;
}

export interface CategoriaSearchResult {
  id: number;
  nombre: string;
  resumen: string;
}

export interface ProveedorSearchResult {
  id: number;
  nombre: string;
  ruc_dni: string;
  resumen: string;
}

export interface GlobalSearchResponse {
  productos: ProductoSearchResult[];
  ventas: VentaSearchResult[];
  categorias: CategoriaSearchResult[];
  proveedores: ProveedorSearchResult[];
}

export interface Recommendation {
  id: number;
  alert_id: number | null;
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
  product?: Producto;
  supplier?: any; // Use Supplier type if available
  alert?: Alert;
  user?: { id: number; nombre: string; email?: string };
  createdAt: string;
}

export interface RecommendationActionData {
  descuento?: number;
  promocion_hasta?: string | null;
}

export interface Alert {
  id: number;
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  product_id?: number;
  product?: Producto;
  resolved: boolean;
  createdAt: string;
}

export type TipoDescuento = 'producto' | 'categoria' | 'todos';
export type FuenteDescuento = 'recomendacion' | 'masivo' | 'manual';

export interface Descuento {
  id: number;
  porcentaje: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  fuente: FuenteDescuento;
  producto_id?: number | null;
  categoria_id?: number | null;
  todos_productos: boolean;
  recomendacion_id?: number | null;
  creado_por?: number | null;
  productos_excluidos?: number[] | null;
  producto?: { id: number; codigo: string; nombre: string } | null;
  categoria?: { id: number; nombre: string } | null;
  creador?: { id: number; nombre: string } | null;
  createdAt: string;
}

export interface ProductoVistaPrevia {
  producto_id: number;
  codigo: string;
  nombre: string;
  precio_venta: number;
  margen: number;
  descuentoEfectivo: number;
  limitadoPorMargen: boolean;
}

export interface OmitidoVistaPrevia {
  producto_id: number;
  codigo: string;
  nombre: string;
  motivo: 'recomendacion' | 'inactivo';
}

export interface VistaPreviaDescuento {
  afectados: ProductoVistaPrevia[];
  omitidos: OmitidoVistaPrevia[];
  excluidos?: ProductoVistaPrevia[];
  descuentoEfectivoLote: number;
  porcentajeSolicitado: number;
}

