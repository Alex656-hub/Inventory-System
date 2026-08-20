import api from '../config/api';
import { supplierService } from './supplier.service';
import { clientService } from './client.service';

export interface OperacionStock {
  id?: number;
  tipo_operacion: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  fecha_emision: Date;
  personal_id?: number;
  responsable_fisico_id?: number;
  referencia?: string;
  sede_origen_id?: number;
  sede_destino_id?: number;
  proveedor_id?: number;
  cliente_id?: number;
  motivo_traspaso?: string;
  total_unidades: number;
  costo_total: number;
  estado: 'BORRADOR' | 'PROCESADO' | 'CANCELADO';
  detalles: DetalleOperacion[];
  // Campos para ventas en cuotas
  metodo_pago?: 'efectivo' | 'credito' | 'tarjeta';
  num_cuotas?: number;
  frecuencia_cuota?: 'semanal' | 'quincenal' | 'mensual';
  interes_mensual?: number;
  primer_vencimiento?: Date;
  garantia_tipo?: 'dni' | 'telefono' | 'ninguna';
  garantia_valor?: string;
  aval_nombre?: string;
  aval_contacto?: string;
  aval_direccion?: string;
  responsable_cobro?: string;
}

export interface DetalleOperacion {
  id?: number;
  operacion_id?: number;
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
  descuento?: number;
  precio_lista?: number;
  subtotal: number;
  lote?: string;
  fecha_vencimiento?: Date;
  producto?: {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    precio_compra: number;
    precio_venta: number;
    unidad_nombre?: string;
    categoria_nombre?: string;
  };
}

export interface StockDisponible {
  producto_id: number;
  producto_nombre: string;
  sede_id: number;
  sede_nombre: string;
  cantidad_actual: number;
  stock_minimo: number;
  estado_stock: 'SUFICIENTE' | 'BAJO' | 'AGOTADO';
}

export interface ProductoBusqueda {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio_compra: number;
  precio_venta: number;
  unidad_id?: number;
  unidad_nombre?: string;
  categoria_nombre?: string;
  stock_disponible: number;
  stock_minimo: number;
}

export interface Sede {
  id: number;
  nombre: string;
  tipo: 'tienda' | 'almacen' | 'oficina' | 'bodega';
  direccion: string;
  telefono?: string;
  email?: string;
  responsable?: string;
  estado: 'activo' | 'inactivo';
}

export interface Proveedor {
  id: number;
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado: 'activo' | 'inactivo';
}

export interface Cliente {
  id: number;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado: boolean;
}

export interface Personal {
  id: number;
  nombreCompleto: string;
  cargo: 'Almacenero' | 'Repartidor';
  telefono?: string;
  activo: boolean;
}

export interface CuentaPorCobrar {
  id: number;
  salida_id: number;
  numero_cuota: number;
  total_cuotas: number;
  monto_capital: number;
  monto_interes: number;
  monto_total: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'pagada' | 'atrasada';
  fecha_pago?: string | null;
  observaciones?: string | null;
  garantia_tipo: string;
  garantia_valor: string;
  aval_nombre?: string | null;
  aval_contacto?: string | null;
  aval_direccion?: string | null;
  responsable_cobro?: string | null;
  salida: {
    id: number;
    numero_documento: string;
    fecha: string;
    total: number;
    cliente_nombre: string;
    cliente_documento: string;
  };
}

export interface AgingBucket {
  actual: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

export interface CuotasClienteResponse {
  cuotas: CuentaPorCobrar[];
  paginacion: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

export interface CarteraCliente {
  cliente_id: number | null;
  nombre: string;
  documento: string;
  cuotas_pendientes: number;
  saldo_capital: number;
  total: number;
  aging: AgingBucket;
}

class OperacionStockService {
  // Operaciones de Stock
  async crearOperacion(operacion: Omit<OperacionStock, 'id' | 'total_unidades' | 'costo_total' | 'estado'>) {
    const response = await api.post('/stock', operacion);
    return response.data;
  }

  async listarOperaciones(params?: {
    page?: number;
    limit?: number;
    tipo?: string;
    estado?: string;
  }) {
    const response = await api.get('/stock', { params });
    return response.data;
  }

  async obtenerEstadisticas(): Promise<{
    hoy: { total: number; entradas: number; salidas: number };
    mes: { total: number; entradas: number; salidas: number; traspasos: number; costoTotal: number; unidadesTotales: number };
  }> {
    const response = await api.get('/stock/stats');
    return response.data;
  }

  async obtenerTendencia(dias: number = 30): Promise<Array<{
    fecha: string;
    ENTRADA: number;
    SALIDA: number;
    TRASPASO: number;
  }>> {
    const response = await api.get('/stock/tendencia', { params: { dias } });
    return response.data;
  }

  async obtenerMetricasPorSede(meses: number = 6): Promise<Array<{
    sede: string;
    ENTRADA: number;
    SALIDA: number;
    TRASPASO: number;
    costoTotal: number;
  }>> {
    const response = await api.get('/stock/metricas-por-sede', { params: { meses } });
    return response.data;
  }

  async topProveedores(limite: number = 5, meses: number = 6): Promise<Array<{
    proveedorId: number;
    nombre: string;
    totalOperaciones: number;
    montoTotal: number;
  }>> {
    const response = await api.get('/stock/top-proveedores', { params: { limite, meses } });
    return response.data;
  }

  async topClientes(limite: number = 5, meses: number = 6): Promise<Array<{
    clienteId: number;
    nombre: string;
    totalOperaciones: number;
    montoTotal: number;
  }>> {
    const response = await api.get('/stock/top-clientes', { params: { limite, meses } });
    return response.data;
  }

  async exportarExcel(): Promise<Blob> {
    const response = await api.get('/stock/export-excel', { responseType: 'blob' });
    return response.data;
  }

  async obtenerOperacion(id: number) {
    const response = await api.get(`/stock/${id}`);
    return response.data;
  }

  async procesarOperacion(id: number) {
    const response = await api.put(`/stock/${id}/procesar`);
    return response.data;
  }

  // Consultas de Stock
  async obtenerStockDisponible(productoId: number, sedeId: number): Promise<StockDisponible> {
    const response = await api.get(`/stock/stock/disponible/${productoId}/${sedeId}`);
    return response.data;
  }

  // Búsqueda de productos
  async buscarProductos(termino: string, sedeId?: number): Promise<ProductoBusqueda[]> {
    const params: any = { termino };
    if (sedeId) params.sedeId = sedeId;
    
    const response = await api.get('/stock/productos/buscar', { params });
    return response.data;
  }

  // Catálogos para selects
  async obtenerSedes(): Promise<Sede[]> {
    const response = await api.get('/sedes');
    return response.data.sedes || response.data;
  }

  async obtenerProveedores(): Promise<Proveedor[]> {
    const response = await supplierService.obtenerProveedores({ limite: 1000 });
    return response.proveedores.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      tipo_documento: p.ruc_dni?.length === 11 ? 'RUC' : 'DNI',
      numero_documento: p.ruc_dni || '',
      estado: p.activo ? 'activo' : 'inactivo'
    }));
  }

  async obtenerClientes(): Promise<Cliente[]> {
    try {
      return await clientService.listar();
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      return [];
    }
  }

  async obtenerPersonal(): Promise<Personal[]> {
    const response = await api.get('/personal');
    const personal = response.data.personal || response.data;
    return personal;
  }

  // Validaciones
  validarCamposPorTipo(operacion: Partial<OperacionStock>): { valido: boolean; mensaje: string } {
    switch (operacion.tipo_operacion) {
      case 'ENTRADA':
        if (!operacion.sede_destino_id) {
          return { valido: false, mensaje: 'La sede destino es requerida para entradas' };
        }
        if (!operacion.proveedor_id) {
          return { valido: false, mensaje: 'El proveedor es requerido para entradas' };
        }
        break;
      case 'SALIDA':
        if (!operacion.sede_origen_id) {
          return { valido: false, mensaje: 'La sede origen es requerida para salidas' };
        }
        break;
      case 'TRASPASO':
        if (!operacion.sede_origen_id || !operacion.sede_destino_id) {
          return { valido: false, mensaje: 'Ambas sedes (origen y destino) son requeridas para traspasos' };
        }
        if (operacion.sede_origen_id === operacion.sede_destino_id) {
          return { valido: false, mensaje: 'Las sedes de origen y destino deben ser diferentes' };
        }
        break;
    }
    return { valido: true, mensaje: '' };
  }

  // Cuentas por Cobrar
  async getCuotasCliente(clienteId: number, params?: {
    estado?: string;
    soloVencidas?: boolean;
    pagina?: number;
    limite?: number;
  }): Promise<CuotasClienteResponse> {
    const response = await api.get(`/cuotas/cliente/${clienteId}`, { params });
    return response.data;
  }

  async getAgingCliente(clienteId: number): Promise<AgingBucket> {
    const response = await api.get(`/cuotas/aging/cliente/${clienteId}`);
    return response.data;
  }

  async getCartera(): Promise<CarteraCliente[]> {
    const response = await api.get('/cuotas/cartera');
    return response.data;
  }

  async pagarCuota(cuotaId: number, data: { fecha_pago?: string; observaciones?: string }): Promise<any> {
    const response = await api.post(`/cuotas/${cuotaId}/pay`, data);
    return response.data;
  }
}

const operacionStockService = new OperacionStockService();

export default operacionStockService;
