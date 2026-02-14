import api from '../config/api';

export interface ImportResult {
  filasProcesadas: number;
  nuevasCategorias: number;
  nuevosProveedores: number;
  nuevosProductos: number;
  nuevasSalidas: number;
  errores?: string[];
  proveedoresConRUCTemporal?: string[]; // Nombres de proveedores con RUC temporal
}

export const importService = {
  importSales: async (file: File): Promise<{ success: boolean; data?: ImportResult; message?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<{ success: boolean; data: ImportResult; message: string }>(
      '/sales/import',
      formData
      // NO enviar headers: { 'Content-Type': 'multipart/form-data' }
    );

    return data;
  }
};
