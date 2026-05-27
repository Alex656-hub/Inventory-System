import api from '../config/api';

export interface Sede {
  id: number;
  nombre: string;
  tipo: 'tienda' | 'almacen' | 'oficina' | 'bodega';
  direccion: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
  almacenes?: Almacen[];
}

export interface Almacen {
  id: number;
  nombre: string;
  codigo: string;
  sede_id: number;
  tipo: 'principal' | 'secundario' | 'temporal' | 'virtual';
  capacidad?: number;
  unidad_capacidad?: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
  sede?: {
    id: number;
    nombre: string;
    tipo: string;
  };
}

export interface SedeRequest {
  nombre: string;
  tipo: 'tienda' | 'almacen' | 'oficina' | 'bodega';
  direccion: string;
  telefono?: string;
  email?: string;
  responsable?: string;
}

export interface AlmacenRequest {
  nombre: string;
  codigo: string;
  sede_id: number;
  tipo: 'principal' | 'secundario' | 'temporal' | 'virtual';
  capacidad?: number;
  unidad_capacidad?: string;
  descripcion?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export interface SedeFilters {
  pagina?: number;
  limite?: number;
  busqueda?: string;
  tipo?: string;
  estado?: string;
  orden?: string;
  direccion?: string;
}

export interface AlmacenFilters {
  pagina?: number;
  limite?: number;
  busqueda?: string;
  tipo?: string;
  estado?: string;
  sede_id?: string;
  orden?: string;
  direccion?: string;
}

class SedeService {
  // ==================== SEDES ====================

  async obtenerSedes(filters: SedeFilters = {}): Promise<PaginatedResponse<Sede>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/sedes?${params.toString()}`);

      return {
        data: response.data.sedes,
        paginacion: response.data.paginacion
      };
    } catch (error) {
      console.error('Error al obtener sedes:', error);
      throw error;
    }
  }

  async obtenerSedePorId(id: number): Promise<Sede> {
    try {
      const response = await api.get(`/sedes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener sede:', error);
      throw error;
    }
  }

  async crearSede(sede: SedeRequest): Promise<Sede> {
    try {
      const response = await api.post('/sedes', sede);
      return response.data.sede;
    } catch (error) {
      console.error('Error al crear sede:', error);
      throw error;
    }
  }

  async actualizarSede(id: number, sede: Partial<SedeRequest>): Promise<Sede> {
    try {
      const response = await api.put(`/sedes/${id}`, sede);
      return response.data.sede;
    } catch (error) {
      console.error('Error al actualizar sede:', error);
      throw error;
    }
  }

  async eliminarSede(id: number): Promise<void> {
    try {
      await api.delete(`/sedes/${id}`);
    } catch (error) {
      console.error('Error al eliminar sede:', error);
      throw error;
    }
  }

  async toggleEstadoSede(id: number): Promise<{ estado: string }> {
    try {
      const response = await api.patch(`/sedes/${id}/toggle-estado`);
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado de sede:', error);
      throw error;
    }
  }

  async obtenerSedesSelect(): Promise<Sede[]> {
    try {
      const response = await api.get('/sedes/select');
      return response.data;
    } catch (error) {
      console.error('Error al obtener sedes para select:', error);
      throw error;
    }
  }

  async obtenerEstadisticasSedes(): Promise<{
    totalSedes: number;
    sedesActivas: number;
    sedesInactivas: number;
    sedesPorTipo: Array<{ tipo: string; cantidad: number }>;
  }> {
    try {
      const response = await api.get('/sedes/estadisticas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de sedes:', error);
      throw error;
    }
  }

  // ==================== ALMACENES ====================

  async obtenerAlmacenes(filters: AlmacenFilters = {}): Promise<PaginatedResponse<Almacen>> {
    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/almacenes?${params.toString()}`);

      return {
        data: response.data.almacenes,
        paginacion: response.data.paginacion
      };
    } catch (error) {
      console.error('Error al obtener almacenes:', error);
      throw error;
    }
  }

  async obtenerAlmacenPorId(id: number): Promise<Almacen> {
    try {
      const response = await api.get(`/almacenes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener almacén:', error);
      throw error;
    }
  }

  async crearAlmacen(almacen: AlmacenRequest): Promise<Almacen> {
    try {
      const response = await api.post('/almacenes', almacen);
      return response.data.almacen;
    } catch (error) {
      console.error('Error al crear almacén:', error);
      throw error;
    }
  }

  async actualizarAlmacen(id: number, almacen: Partial<AlmacenRequest>): Promise<Almacen> {
    try {
      const response = await api.put(`/almacenes/${id}`, almacen);
      return response.data.almacen;
    } catch (error) {
      console.error('Error al actualizar almacén:', error);
      throw error;
    }
  }

  async eliminarAlmacen(id: number): Promise<void> {
    try {
      await api.delete(`/almacenes/${id}`);
    } catch (error) {
      console.error('Error al eliminar almacén:', error);
      throw error;
    }
  }

  async toggleEstadoAlmacen(id: number): Promise<{ estado: string }> {
    try {
      const response = await api.patch(`/almacenes/${id}/toggle-estado`);
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado de almacén:', error);
      throw error;
    }
  }

  async obtenerAlmacenesSelect(sede_id?: number): Promise<Almacen[]> {
    try {
      const params = sede_id ? `?sede_id=${sede_id}` : '';
      const response = await api.get(`/almacenes/select${params}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener almacenes para select:', error);
      throw error;
    }
  }

  async obtenerAlmacenesPorSede(sede_id: number): Promise<{
    sede: {
      id: number;
      nombre: string;
      tipo: string;
      direccion: string;
    };
    almacenes: Almacen[];
  }> {
    try {
      const response = await api.get(`/almacenes/sede/${sede_id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener almacenes por sede:', error);
      throw error;
    }
  }

  async obtenerEstadisticasAlmacenes(): Promise<{
    totalAlmacenes: number;
    almacenesActivos: number;
    almacenesInactivos: number;
    almacenesPorTipo: Array<{ tipo: string; cantidad: number }>;
    almacenesPorSede: Array<{ sede_id: number; cantidad: number; 'sede.nombre': string }>;
  }> {
    try {
      const response = await api.get('/almacenes/estadisticas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de almacenes:', error);
      throw error;
    }
  }
}

export const sedeService = new SedeService();
