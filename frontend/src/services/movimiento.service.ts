import api from '../config/api';

export interface Movimiento {
  id: number;
  fecha: string;
  tipo_movimiento: string;
  referencia_id: number | null;
  tipo_referencia: string | null;
  cantidad: number;
  precio_unitario: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  observaciones: string | null;
  usuario: string;
  producto: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
  operacion_tipo: string | null;
  sede_origen: string | null;
  sede_destino: string | null;
  responsable: string | null;
  tiene_pdf: boolean;
}

export interface HistorialResponse {
  movimientos: Movimiento[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export interface PreviewResponse {
  html: string;
  operacion_id: number;
}

interface HistorialParams {
  pagina?: number;
  limite?: number;
  producto_id?: number | string;
  tipo_movimiento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  sede_id?: number;
}

export const movimientoService = {
  getHistorial: async (params: HistorialParams): Promise<HistorialResponse> => {
    const queryParams = new URLSearchParams();
    if (params.pagina) queryParams.append('pagina', String(params.pagina));
    if (params.limite) queryParams.append('limite', String(params.limite));
    if (params.producto_id) queryParams.append('producto_id', String(params.producto_id));
    if (params.tipo_movimiento) queryParams.append('tipo_movimiento', params.tipo_movimiento);
    if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
    if (params.sede_id) queryParams.append('sede_id', String(params.sede_id));

    const response = await api.get(`/inventory/movements/historial?${queryParams.toString()}`);
    return response.data;
  },

  getMovimientoPreview: async (id: number): Promise<PreviewResponse> => {
    const response = await api.get(`/inventory/movements/${id}/preview`);
    return response.data;
  },

  getMovimientoPdf: async (id: number): Promise<Blob> => {
    const response = await api.get(`/inventory/movements/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getKardex: async (productoId: number, metodo: string = 'promedio') => {
    const response = await api.get(`/inventory/movements/kardex/${productoId}?metodo=${metodo}`);
    return response.data;
  },

  getMovimientos: async (params: {
    pagina?: number;
    limite?: number;
    producto_id?: number;
    tipo_movimiento?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.pagina) queryParams.append('pagina', String(params.pagina));
    if (params.limite) queryParams.append('limite', String(params.limite));
    if (params.producto_id) queryParams.append('producto_id', String(params.producto_id));
    if (params.tipo_movimiento) queryParams.append('tipo_movimiento', params.tipo_movimiento);
    if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);

    const response = await api.get(`/inventory/movimientos?${queryParams.toString()}`);
    return response.data;
  },
};

export default movimientoService;