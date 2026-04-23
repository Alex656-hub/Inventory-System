import api from '../config/api';
import { Producto } from '../types';

interface Paginacion {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface ProductosResponse {
  productos: Producto[];
  paginacion: Paginacion;
}

export const productService = {
  obtenerProductos: async (params?: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    categoria_id?: number;
    activo?: boolean;
  }): Promise<ProductosResponse> => {
    const { data } = await api.get<ProductosResponse>('/products', { params });
    return data;
  },

  obtenerProductoPorId: async (id: number): Promise<Producto> => {
    const { data } = await api.get<Producto>(`/products/${id}`);
    return data;
  },

  crearProducto: async (
    producto: Partial<Producto>,
    imageFile?: File | null
  ): Promise<{ mensaje: string; producto: Producto }> => {
    if (imageFile) {
      const fd = new FormData();
      Object.entries(producto).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        fd.append(k, String(v));
      });
      fd.append('image', imageFile);
      const { data } = await api.post<{ mensaje: string; producto: Producto }>('/products', fd);
      return data;
    }

    const { data } = await api.post<{ mensaje: string; producto: Producto }>('/products', producto);
    return data;
  },

  actualizarProducto: async (
    id: number,
    producto: Partial<Producto>,
    imageFile?: File | null
  ): Promise<{ mensaje: string; producto: Producto }> => {
    if (imageFile) {
      const fd = new FormData();
      Object.entries(producto).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        fd.append(k, String(v));
      });
      fd.append('image', imageFile);
      const { data } = await api.put<{ mensaje: string; producto: Producto }>(`/products/${id}`, fd);
      return data;
    }

    const { data } = await api.put<{ mensaje: string; producto: Producto }>(`/products/${id}`, producto);
    return data;
  },

  eliminarProducto: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/products/${id}`);
    return data;
  },

  obtenerSiguienteCodigo: async (categoria_id: number): Promise<{ codigo: string }> => {
    const { data } = await api.get<{ codigo: string }>(`/products/next-code/${categoria_id}`);
    return data;
  },

  obtenerProductosStockBajo: async (): Promise<{ productos: Producto[] }> => {
    const { data } = await api.get<{ productos: Producto[] }>('/products/stock-bajo');
    return data;
  }
};

