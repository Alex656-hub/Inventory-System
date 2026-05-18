import api from '../config/api';
import { Cliente } from '../components/ClientForm';

export interface ClienteAPI {
  id: number;
  nombre: string;
  tipo_documento: 'DNI' | 'RUC' | 'PASAPORTE' | 'OTRO';
  numero_documento: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado: 'activo' | 'inactivo';
}

const mapToForm = (c: ClienteAPI): Cliente => ({
  id: c.id,
  nombre: c.nombre,
  documento: c.numero_documento || '',
  telefono: c.telefono || '',
  email: c.email || '',
  direccion: c.direccion || '',
  estado: c.estado === 'activo',
});

const mapToAPI = (data: Omit<Cliente, 'id'>): Omit<ClienteAPI, 'id'> => {
  const doc = data.documento || '';
  return {
    nombre: data.nombre,
    tipo_documento: doc.length === 11 ? 'RUC' : 'DNI',
    numero_documento: doc,
    telefono: data.telefono || undefined,
    email: data.email || undefined,
    direccion: data.direccion || undefined,
    estado: data.estado ? 'activo' : 'inactivo',
  };
};

export const clientService = {
  listar: async (): Promise<Cliente[]> => {
    const { data } = await api.get<ClienteAPI[]>('/clients');
    const arr = Array.isArray(data) ? data : [];
    return arr.map(mapToForm);
  },

  obtener: async (id: number): Promise<Cliente> => {
    const { data } = await api.get<ClienteAPI>(`/clients/${id}`);
    return mapToForm(data);
  },

  crear: async (input: Omit<Cliente, 'id'>): Promise<Cliente> => {
    const { data } = await api.post<ClienteAPI>('/clients', mapToAPI(input));
    return mapToForm(data);
  },

  actualizar: async (id: number, input: Omit<Cliente, 'id'>): Promise<Cliente> => {
    const { data } = await api.put<ClienteAPI>(`/clients/${id}`, mapToAPI(input));
    return mapToForm(data);
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/clients/${id}`);
  },
};

export default clientService;