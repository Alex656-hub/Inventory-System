export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'gerente' | 'empleado';
  activo: boolean;
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
  token: string;
  usuario: Usuario;
}

