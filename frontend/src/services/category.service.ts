import api from '../config/api';
import { Categoria } from '../types';

export const categoryService = {
  obtenerCategorias: async (activa?: boolean): Promise<{ categorias: Categoria[] }> => {
    const params = activa !== undefined ? { activa: activa.toString() } : {};
    const { data } = await api.get<{ categorias: Categoria[] }>('/categories', { params });
    return data;
  },

  obtenerCategoriaPorId: async (id: number): Promise<Categoria> => {
    const { data } = await api.get<Categoria>(`/categories/${id}`);
    return data;
  },

  crearCategoria: async (categoria: Partial<Categoria>): Promise<{ mensaje: string; categoria: Categoria }> => {
    const { data } = await api.post<{ mensaje: string; categoria: Categoria }>('/categories', categoria);
    return data;
  },

  actualizarCategoria: async (id: number, categoria: Partial<Categoria>): Promise<{ mensaje: string; categoria: Categoria }> => {
    const { data } = await api.put<{ mensaje: string; categoria: Categoria }>(`/categories/${id}`, categoria);
    return data;
  },

  eliminarCategoria: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/categories/${id}`);
    return data;
  }
};

