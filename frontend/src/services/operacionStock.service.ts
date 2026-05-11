import api from '../config/api';
import { supplierService } from './supplier.service';

export interface OperacionStock {
  id?: number;
  tipo_operacion: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
  fecha_emision: Date;
  responsable_fisico_id: number;
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
  tipo_documento: 'DNI' | 'RUC' | 'PASAPORTE' | 'OTRO';
  numero_documento: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado: 'activo' | 'inactivo';
}

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

class OperacionStockService {
  // Operaciones de Stock
  async crearOperacion(operacion: Omit<OperacionStock, 'id' | 'total_unidades' | 'costo_total' | 'estado'>) {
    const response = await api.post('/stock/operaciones', operacion);
    return response.data;
  }

  async listarOperaciones(params?: {
    page?: number;
    limit?: number;
    tipo?: string;
    estado?: string;
  }) {
    const response = await api.get('/stock/operaciones', { params });
    return response.data;
  }

  async obtenerOperacion(id: number) {
    const response = await api.get(`/stock/operaciones/${id}`);
    return response.data;
  }

  async procesarOperacion(id: number) {
    const response = await api.put(`/stock/operaciones/${id}/procesar`);
    return response.data;
  }

  // Consultas de Stock
  async obtenerStockDisponible(productoId: number, sedeId: number): Promise<StockDisponible> {
    const response = await api.get(`/stock/stock/disponible/${productoId}/${sedeId}`);
    return response.data;
  }

  async obtenerStockPorProducto(productoId: number): Promise<StockDisponible[]> {
    const response = await api.get(`/stock/stock/producto/${productoId}`);
    return response.data;
  }

  async obtenerStockPorSede(sedeId: number): Promise<StockDisponible[]> {
    const response = await api.get(`/stock/stock/sede/${sedeId}`);
    return response.data;
  }

  async obtenerStockGeneral(): Promise<StockDisponible[]> {
    const response = await api.get('/stock/stock/general');
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
    // Usar los mismos datos locales que ClientList.tsx
    return [
      {
        id: 1,
        nombre: 'Cliente 1',
        documento: '2013489182',
        telefono: '876543121',
        estado: true,
      }
    ].map(c => ({
      id: c.id,
      nombre: c.nombre,
      tipo_documento: c.documento?.length === 11 ? 'RUC' : 'DNI',
      numero_documento: c.documento || '',
      estado: c.estado ? 'activo' : 'inactivo'
    }));
  }

  async obtenerUsuarios(): Promise<User[]> {
    const response = await api.get('/users');
    console.log('Respuesta de /api/users:', response.data);
    const usuarios = response.data.users || response.data;
    console.log('Usuarios extraídos:', usuarios);
    return usuarios;
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

  // Utilidades
  calcularTotales(detalles: DetalleOperacion[]): { total_unidades: number; costo_total: number } {
    const total_unidades = detalles.reduce((sum, detalle) => sum + detalle.cantidad, 0);
    const costo_total = detalles.reduce((sum, detalle) => sum + detalle.subtotal, 0);
    return { total_unidades, costo_total };
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
