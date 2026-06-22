import api from '../config/api';

export const backupService = {
  createBackup: async (): Promise<Blob> => {
    const response = await api.post('/backup/create', null, {
      responseType: 'blob'
    });
    return response.data;
  },

  restoreBackup: async (file: File): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<{ success: boolean; message: string }>(
      '/backup/restore',
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
