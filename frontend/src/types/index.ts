export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'gerente' | 'empleado';
  activo: boolean;
  twoFactorEnabled?: boolean;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria_id: number;
  proveedor_id: number;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  ubicacion?: string;
  imagen_url?: string;
  activo: boolean;
  categoria?: Categoria;
  proveedor?: Proveedor;
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

export interface LoginRequest {
  email: string;
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

export interface Alert {
  id: number;
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  product_id?: number;
  product?: Producto;
  resolved: boolean;
  created_at: string;
}

