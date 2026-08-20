import api from '../config/api';
import { Descuento, TipoDescuento, VistaPreviaDescuento } from '../types';

export const descuentoService = {
  listarDescuentos: async (params?: {
    fuente?: string;
    tipo?: TipoDescuento;
    categoria_id?: number;
    activos?: boolean;
  }): Promise<{ descuentos: Descuento[] }> => {
    const { data } = await api.get('/descuentos', { params });
    return data;
  },

  vistaPrevia: async (body: {
    tipo: TipoDescuento;
    producto_id?: number;
    categoria_id?: number;
    porcentaje: number;
    fecha_fin?: string | null;
    productos_excluidos?: number[];
  }): Promise<VistaPreviaDescuento> => {
    const { data } = await api.post<{ success: boolean; data: VistaPreviaDescuento }>('/descuentos/vista-previa', body);
    return data.data;
  },

  aplicarDescuento: async (body: {
    tipo: TipoDescuento;
    producto_id?: number;
    categoria_id?: number;
    porcentaje: number;
    fecha_fin?: string | null;
    productos_excluidos?: number[];
  }): Promise<{
    tipo: TipoDescuento;
    descuentoAplicado: number;
    productosAfectados: number;
    omitidos: number;
    excluidos: number;
  }> => {
    const { data } = await api.post<{ success: boolean; data: any }>('/descuentos', body);
    return data.data;
  },

  revertirDescuento: async (id: number): Promise<{ mensaje: string }> => {
    const { data } = await api.delete(`/descuentos/${id}`);
    return data;
  },

  revertirMasivo: async (body: { tipo: TipoDescuento; categoria_id?: number }): Promise<{ revertidos: number }> => {
    const { data } = await api.post<{ success: boolean; data: { revertidos: number } }>('/descuentos/revertir-masivo', body);
    return data.data;
  }
};