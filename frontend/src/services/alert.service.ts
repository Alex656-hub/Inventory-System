import api from '../config/api';
import { Alert, Recommendation, RecommendationActionData } from '../types';

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
    capitalEnRiesgo: number;
    capitalInmovilizado: number;
    accionesPendientes: number;
  };
}

export interface RecommendationHistoryResponse {
  items: Recommendation[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
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
  // Nuevos campos para flujo de caja
  porCobrar30d?: number;
  efectivoDisponible?: number;
  saldoProyectado?: number;
}

export interface RecommendationMetrics {
  total: number;
  pendientes: number;
  aceptadas: number;
  rechazadas: number;
  ejecutadas: number;
  tasaAceptacion: number;
  tasaRechazo: number;
  precision: number;
}

export interface AgingBucket {
  actual: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ForecastHistoricalPoint {
  date: string;
  quantity: number;
}

export interface AdvancedForecast {
  forecast: ForecastPoint[];
  historicalData: ForecastHistoricalPoint[];
  mape: number;
  seasonality: {
    weekly: number[];
    monthly: number[];
  };
  cached: boolean;
  lastTrained: string;
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

  getRecommendations: async (estado?: 'pendientes' | 'aceptadas' | 'rechazadas' | 'todas'): Promise<RecommendationsResponse> => {
    const { data } = await api.get<RecommendationsResponse>('/alerts/recommendations', { params: { estado } });
    return data;
  },

  generateRecommendations: async (): Promise<{ nuevas: number }> => {
    const { data } = await api.post<{ nuevas: number }>('/alerts/recommendations/generate');
    return data;
  },

  updateRecommendationStatus: async (id: number, action: 'accept' | 'reject', data?: RecommendationActionData): Promise<{ mensaje: string }> => {
    const payload = action === 'accept' && data ? data : undefined;
    const { data: response } = await api.put<{ mensaje: string }>(
      `/alerts/recommendations/${id}/${action}`,
      payload
    );
    return response;
  },

  getRecommendationMetrics: async (): Promise<RecommendationMetrics> => {
    const { data } = await api.get<{ metricas: RecommendationMetrics }>('/alerts/recommendations/metrics');
    return data.metricas;
  },

  getRecommendationHistory: async (params?: {
    pagina?: number;
    limite?: number;
    estado?: string;
    tipo?: string;
  }): Promise<RecommendationHistoryResponse> => {
    const { data } = await api.get<RecommendationHistoryResponse>('/alerts/recommendations/history', { params });
    return data;
  },

  reopenRecommendation: async (id: number): Promise<{ mensaje: string; recomendacion?: Recommendation }> => {
    const { data } = await api.put<{ mensaje: string; recomendacion?: Recommendation }>(`/alerts/recommendations/${id}/reopen`);
    return data;
  },

  getAnalytics: async (params?: { fechaInicio?: string; fechaFin?: string }): Promise<InventoryMetrics> => {
    const { data } = await api.get<InventoryMetrics>('/alerts/analytics', { params });
    return data;
  },

  getFinancialProjections: async (months?: number): Promise<{ data: any[] }> => {
    const { data } = await api.get('/analytics/projections', { params: { months } });
    return data;
  },

  getBreakEvenPoint: async (): Promise<{ data: any }> => {
    const { data } = await api.get('/analytics/break-even');
    return data;
  },

  getAging: async (): Promise<AgingBucket> => {
    const { data } = await api.get<{ success: boolean; data: AgingBucket }>('/analytics/aging');
    return data.data;
  },

  getAdvancedForecast: async (productId: number, days: number = 30): Promise<AdvancedForecast> => {
    const { data } = await api.get<{ success: boolean; data: AdvancedForecast }>('/analytics/advanced-forecast', {
      params: { productId, days }
    });
    return data.data;
  }
};
