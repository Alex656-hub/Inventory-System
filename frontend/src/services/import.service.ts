import api from '../config/api';

export interface ImportResult {
  filasProcesadas: number;
  nuevasCategorias: number;
  nuevosProveedores: number;
  nuevosProductos: number;
  nuevasUnidades: number;
  nuevasSedes: number;
  nuevosAlmacenes: number;
  nuevosClientes: number;
  nuevoPersonal: number;
  nuevasEntradas: number;
  nuevasSalidas: number;
  errores?: string[];
  advertencias?: string[];
}

export const importService = {
  importSales: async (file: File): Promise<{ success: boolean; data?: ImportResult; message?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<{ success: boolean; data: ImportResult; message: string }>(
      '/sales/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return data;
  }
};
