import api from '../config/api';

export interface PersonalItem {
  id: number;
  nombreCompleto: string;
  cargo: 'Almacenero' | 'Repartidor';
  telefono?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const personalService = {
  obtenerPersonal: async (activo?: boolean, busqueda?: string): Promise<{ personal: PersonalItem[] }> => {
    const params: any = {};
    if (activo !== undefined) {
      params.activo = activo.toString();
    }
    if (busqueda) {
      params.busqueda = busqueda;
    }
    const { data } = await api.get<{ personal: PersonalItem[] }>('/personal', { params });
    return data;
  },

  obtenerPersonalPorId: async (id: number): Promise<PersonalItem> => {
    const { data } = await api.get<PersonalItem>(`/personal/${id}`);
    return data;
  },

  crearPersonal: async (personal: Partial<PersonalItem>): Promise<{ mensaje: string; personal: PersonalItem }> => {
    const { data } = await api.post<{ mensaje: string; personal: PersonalItem }>('/personal', personal);
    return data;
  },

  actualizarPersonal: async (id: number, personal: Partial<PersonalItem>): Promise<{ mensaje: string; personal: PersonalItem }> => {
    const { data } = await api.put<{ mensaje: string; personal: PersonalItem }>(`/personal/${id}`, personal);
    return data;
  },

  eliminarPersonal: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/personal/${id}`);
    return data;
  },

  eliminarPersonalHard: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>(`/personal/hard/${id}`);
    return data;
  }
};
