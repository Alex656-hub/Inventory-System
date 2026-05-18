import api from '../config/api';

export interface KardexParams {
  producto_id: number;
  fecha_desde: string;
  fecha_hasta: string;
}

export interface InventarioParams {
  sede_id?: number;
  almacen_id?: number;
}

export const reporteService = {
  generarKardexPDF: async (params: KardexParams): Promise<Blob> => {
    const response = await api.post('/reports/kardex', params, {
      responseType: 'blob',
    });
    return response.data;
  },

  generarInventarioExcel: async (params: InventarioParams): Promise<Blob> => {
    const response = await api.post('/reports/inventario', params, {
      responseType: 'blob',
    });
    return response.data;
  },

  descargarBlob: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default reporteService;