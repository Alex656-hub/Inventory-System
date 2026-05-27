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
}

export interface DetalleOperacion {
  id?: number;
  operacion_id?: number;
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
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
    console.log('Respuesta sedes:', response.data);
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
    console.log('Respuesta de /api/personal:', response.data);
    const personal = response.data.personal || response.data;
    console.log('Personal extraído:', personal);
    return personal;
  }

  // Validaciones
  async validarStockDisponible(productoId: number, sedeId: number, cantidad: number): Promise<boolean> {
    try {
      const stock = await this.obtenerStockDisponible(productoId, sedeId);
      return stock.cantidad_actual >= cantidad;
    } catch (error) {
      return false;
    }
  }

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
}

const operacionStockService = new OperacionStockService();

export default operacionStockService;
