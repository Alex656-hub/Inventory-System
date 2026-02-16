import api from '../config/api';
import { GlobalSearchResponse } from '../types';

export const searchService = {
  busquedaGlobal: async (query: string, limitPerType?: number): Promise<GlobalSearchResponse> => {
    const { data } = await api.get<GlobalSearchResponse>('/search/global', {
      params: { query, limitPerType }
    });
    return data;
  }
};
