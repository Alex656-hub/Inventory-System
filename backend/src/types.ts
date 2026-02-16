export interface ProductoSearchResult {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: {
    id: number;
    nombre: string;
  };
  resumen: string; // texto corto: stock, precio, etc.
}

export interface VentaSearchResult {
  id: number;
  numero: string;
  fecha: string;
  total: number;
  resumen: string; // cliente o nota
}

export interface CategoriaSearchResult {
  id: number;
  nombre: string;
  resumen: string; // número de productos, etc.
}

export interface ProveedorSearchResult {
  id: number;
  nombre: string;
  ruc_dni: string;
  resumen: string; // teléfono o ciudad
}

export interface GlobalSearchResponse {
  productos: ProductoSearchResult[];
  ventas: VentaSearchResult[];
  categorias: CategoriaSearchResult[];
  proveedores: ProveedorSearchResult[];
}
