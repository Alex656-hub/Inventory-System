import api from '../config/api';
import { Alert } from '../types';

interface Paginacion {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface AlertsResponse {
  alertas: Alert[];
  paginacion: Paginacion;
}

interface RecommendationsResponse {
  recomendaciones: string[];
}

export interface InventoryMetrics {
  stockBajo: number;
  agotados: number;
  totalProductos: number;
  rotacion: number;
  diasInventario: number;
  capitalInmovilizado: number;
  productosLentos: number;
  sinMovimiento: number;
  stockMuerto: number;
  margenBruto: number;
  roiInventario: number;
  precisionInventario: number;
  cicloConversion: number;
  antiguedadPromedio: number;
  tasaAgotamiento: number;
  valorStockMuerto: number;
  lastUpdated: string;
}

export const alertService = {
  getAlerts: async (params?: {
    pagina?: number;
    limite?: number;
    resolved?: boolean;
    type?: string;
    severity?: string;
  }): Promise<AlertsResponse> => {
    const { data } = await api.get<AlertsResponse>('/alerts', { params });
    return data;
  },

  checkAlerts: async (): Promise<{ mensaje: string }> => {
    const { data } = await api.post<{ mensaje: string }>('/alerts/check');
    return data;
  },

  resolveAlert: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.put<{ mensaje: string }>(`/alerts/${id}/resolve`);
    return data;
  },

  getRecommendations: async (): Promise<RecommendationsResponse> => {
    const { data } = await api.get<RecommendationsResponse>('/alerts/recommendations');
    return data;
  },

  getAnalytics: async (): Promise<InventoryMetrics> => {
    const { data } = await api.get<InventoryMetrics>('/alerts/analytics');
    return data;
  }
};
