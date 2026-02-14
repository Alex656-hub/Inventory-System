import api from '../config/api';

export interface Sale {
  id: number;
  fecha: string;
  total: number;
  estado: string;
  usuario: {
    id: number;
    nombre: string;
  };
  detalles: SaleDetail[];
}

export interface SaleDetail {
  id: number;
  cantidad: number;
  subtotal: number;
  producto_id: number;
  producto: {
    id: number;
    nombre: string;
    codigo: string;
    precio_compra: number;
    precio_venta: number;
    categoria: {
      id: number;
      nombre: string;
    };
    proveedor: {
      id: number;
      nombre: string;
      ruc_dni: string;
    };
  };
}

export interface SalesResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    totalPages: number;
    data: Sale[];
  };
}

export interface SalesSummary {
  totals: {
    totalSales: number;
    totalCost: number;
    totalProfit: number;
    totalTransactions: number;
  };
  byCategory: Array<{
    categoryName: string;
    totalSales: number;
    totalProfit: number;
    transactionCount: number;
  }>;
  byProduct: Array<{
    producto: {
      id: number;
      nombre: string;
      codigo: string;
    };
    totalQuantity: number;
    totalSales: number;
    totalProfit: number;
  }>;
  salesTrend: Array<{
    date: string;
    totalSales: number;
    totalProfit: number;
    transactionCount: number;
  }>;
}

export interface SalesSummaryResponse {
  success: boolean;
  data: SalesSummary;
}

export const salesService = {
  // Obtener lista de ventas con paginación y filtros
  getSales: async (params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    productId?: number;
  } = {}): Promise<SalesResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.productId) queryParams.append('productId', params.productId.toString());

    const { data } = await api.get<SalesResponse>(`/sales?${queryParams.toString()}`);
    return data;
  },

  // Obtener resumen de ventas
  getSalesSummary: async (params: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<SalesSummaryResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const { data } = await api.get<SalesSummaryResponse>(`/sales/summary?${queryParams.toString()}`);
    return data;
  }
};
