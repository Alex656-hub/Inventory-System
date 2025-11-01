import api from '../config/api';
import { Proveedor } from '../types';

interface Paginacion {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface ProveedoresResponse {
  proveedores: Proveedor[];
  paginacion: Paginacion;
}

export const supplierService = {
  obtenerProveedores: async (params?: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    activo?: boolean;
  }): Promise<ProveedoresResponse> => {
    const { data } = await api.get<ProveedoresResponse>('/suppliers', { params });
    return data;
  },

  obtenerProveedorPorId: async (id: number): Promise<Proveedor> => {
    const { data } = await api.get<Proveedor>(`/suppliers/${id}`);
    return data;
  },

  crearProveedor: async (proveedor: Partial<Proveedor>): Promise<{ mensaje: string; proveedor: Proveedor }> => {
    const { data } = await api.post<{ mensaje: string; proveedor: Proveedor }>('/suppliers', proveedor);
    return data;
  },

  actualizarProveedor: async (id: number, proveedor: Partial<Proveedor>): Promise<{ mensaje: string; proveedor: Proveedor }> => {
    const { data } = await api.put<{ mensaje: string; proveedor: Proveedor }>(`/suppliers/${id}`, proveedor);
    return data;
  },

  eliminarProveedor: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/suppliers/${id}`);
    return data;
  }
};

