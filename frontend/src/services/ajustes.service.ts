import api from '../config/api';

export interface ConfiguracionSistema {
  id?: number;
  ruc: string;
  direccion: string;
  logo?: string; // Base64 o URL del logo
  logo_filename?: string;
  updatedAt?: string;
}

export const ajustesService = {
  // Obtener configuración actual del sistema
  obtenerConfiguracion: async (): Promise<ConfiguracionSistema> => {
    const { data } = await api.get<ConfiguracionSistema>('/configuracion');
    return data;
  },

  // Guardar configuración del sistema (incluyendo logo)
  guardarConfiguracion: async (configuracion: FormData): Promise<{ mensaje: string; configuracion: ConfiguracionSistema }> => {
    const { data } = await api.post<{ mensaje: string; configuracion: ConfiguracionSistema }>('/configuracion', configuracion, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  // Actualizar configuración sin logo
  actualizarConfiguracion: async (configuracion: Partial<ConfiguracionSistema>): Promise<{ mensaje: string; configuracion: ConfiguracionSistema }> => {
    const { data } = await api.put<{ mensaje: string; configuracion: ConfiguracionSistema }>('/configuracion', configuracion);
    return data;
  },

  // Eliminar logo
  eliminarLogo: async (): Promise<{ mensaje: string }> => {
    const { data } = await api.delete<{ mensaje: string }>('/configuracion/logo');
    return data;
  }
};
