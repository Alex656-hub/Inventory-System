import api from '../config/api';
import { Alert, Recommendation } from '../types';

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
  recomendaciones: Recommendation[];
  resumen: {
    total: number;
    pendientes: number;
    urgentes: number;
    costoTotalEstimado: number;
  };
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

  updateRecommendationStatus: async (id: number, action: 'accept' | 'reject' | 'execute'): Promise<{ mensaje: string }> => {
    const endpoint = action === 'accept' ? 'accept' : action === 'reject' ? 'reject' : 'execute';
    const { data } = await api.put<{ mensaje: string }>(`/alerts/recommendations/${id}/${endpoint}`);
    return data;
  },

  getAnalytics: async (params?: { fechaInicio?: string; fechaFin?: string }): Promise<InventoryMetrics> => {
    const { data } = await api.get<InventoryMetrics>('/alerts/analytics', { params });
    return data;
  }
};
