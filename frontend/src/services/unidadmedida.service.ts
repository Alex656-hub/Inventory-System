import api from '../config/api';
import { UnidadMedida } from '../types';

export const unidadmedidaService = {
  obtenerUnidades: async (estado?: boolean, busqueda?: string): Promise<{ unidades: UnidadMedida[] }> => {
    const params: any = {};
    if (estado !== undefined) {
      params.estado = estado.toString();
    }
    if (busqueda) {
      params.busqueda = busqueda;
    }
    const { data } = await api.get<{ unidades: UnidadMedida[] }>('/unidades', { params });
    return data;
  },

  obtenerUnidadPorId: async (id: number): Promise<UnidadMedida> => {
    const { data } = await api.get<UnidadMedida>(`/unidades/${id}`);
    return data;
  },

  crearUnidad: async (unidad: Partial<UnidadMedida>): Promise<{ mensaje: string; unidad: UnidadMedida }> => {
    const { data } = await api.post<{ mensaje: string; unidad: UnidadMedida }>('/unidades', unidad);
    return data;
  },

  actualizarUnidad: async (id: number, unidad: Partial<UnidadMedida>): Promise<{ mensaje: string; unidad: UnidadMedida }> => {
    const { data } = await api.put<{ mensaje: string; unidad: UnidadMedida }>(`/unidades/${id}`, unidad);
    return data;
  },

  eliminarUnidad: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/unidades/${id}`);
    return data;
  },

  desactivarUnidad: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.put<{ mensaje: string }>(`/unidades/${id}/desactivar`);
    return data;
  },

  activarUnidad: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.put<{ mensaje: string }>(`/unidades/${id}/activar`);
    return data;
  },

  eliminarUnidadHard: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/unidades/hard/${id}`);
    return data;
  }
};
