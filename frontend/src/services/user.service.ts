import api from '../config/api';
import { Usuario } from '../types';

export const userService = {
  obtenerUsuarios: async (): Promise<{ usuarios: Usuario[] }> => {
    const { data } = await api.get<{ usuarios: Usuario[] }>('/users');
    return data;
  },

  obtenerUsuarioPorId: async (id: number): Promise<Usuario> => {
    const { data } = await api.get<Usuario>(`/users/${id}`);
    return data;
  },

  crearUsuario: async (usuario: {
    usuario: string;
    nombre: string;
    password: string;
    rol: 'gerente' | 'empleado';
    permisos?: Record<string, boolean>;
  }): Promise<{ mensaje: string; usuario: Usuario }> => {
    const { data } = await api.post<{ mensaje: string; usuario: Usuario }>('/users', usuario);
    return data;
  },

  actualizarUsuario: async (
    id: number,
    datos: Partial<{
      usuario: string;
      nombre: string;
      password: string;
      rol: 'gerente' | 'empleado';
      activo: boolean;
      permisos: Record<string, boolean>;
    }>
  ): Promise<{ mensaje: string; usuario: Usuario }> => {
    const { data } = await api.put<{ mensaje: string; usuario: Usuario }>(`/users/${id}`, datos);
    return data;
  },

  eliminarUsuario: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/users/${id}`);
    return data;
  }
};
