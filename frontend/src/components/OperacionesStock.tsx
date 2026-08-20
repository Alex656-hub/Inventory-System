import React, { useState, useEffect, useRef } from 'react';
import { OperacionStock, DetalleOperacion, Sede, Proveedor, Cliente, Personal } from '../services/operacionStock.service';
import operacionStockService from '../services/operacionStock.service';
import Modal from './Modal';
import { esPromoActiva } from '../utils/promociones';
import './OperacionesStock.css';

interface OperacionesStockProps {
  onOperacionCreada?: (operacion: OperacionStock) => void;
}

const OperacionesStock: React.FC<OperacionesStockProps> = ({ onOperacionCreada }) => {
  const [operacion, setOperacion] = useState<Partial<OperacionStock>>({
    tipo_operacion: 'ENTRADA',
    fecha_emision: new Date(),
    personal_id: 0,
    metodo_pago: 'efectivo',
    detalles: []
  });

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [exito, setExito] = useState<string>('');
  const [estadisticas, setEstadisticas] = useState<{
    hoy: { total: number; entradas: number; salidas: number };
    mes: { total: number; entradas: number; salidas: number; traspasos: number; costoTotal: number; unidadesTotales: number };
  } | null>(null);

  // Estado para modal de configuración de cuotas
  const [showCuotasModal, setShowCuotasModal] = useState(false);
  const [cuotasConfig, setCuotasConfig] = useState({
    numCuotas: 3,
    frecuencia: 'mensual',
    primerVencimiento: '',
    interesMensual: 0,
    // Garantía / Aval
    garantiaTipo: 'dni',
    garantiaValor: '',
    avalNombre: '',
    avalContacto: '',
    avalDireccion: '',
    responsableCobro: '',
  });
  const [cuotasConfigurada, setCuotasConfigurada] = useState(false);

  useEffect(() => {
    cargarCatalogos();
    cargarEstadisticas();
  }, []);

  const STORAGE_KEY = 'operacionesStock_draft';
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.tipo_operacion) {
          setOperacion(prev => ({
            ...prev,
            tipo_operacion: draft.tipo_operacion,
            sede_origen_id: draft.sede_origen_id || undefined,
            sede_destino_id: draft.sede_destino_id || undefined,
            proveedor_id: draft.proveedor_id || undefined,
            cliente_id: draft.cliente_id || undefined,
            personal_id: draft.personal_id || draft.responsable_fisico_id || 0,
            fecha_emision: draft.fecha_emision ? new Date(draft.fecha_emision) : new Date(),
            referencia: draft.referencia || '',
            detalles: draft.detalles || []
          }));
        }
      } catch (e) {
        console.error('Error al restaurar draft:', e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    const tieneDatos = operacion.tipo_operacion || 
      operacion.sede_origen_id || 
      operacion.sede_destino_id || 
      operacion.proveedor_id ||
      operacion.cliente_id ||
      operacion.responsable_fisico_id ||
      operacion.fecha_emision ||
      (operacion.detalles && operacion.detalles.length > 0);
    
    if (tieneDatos) {
      const detallesSimplificados = (operacion.detalles || []).map(d => ({
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        costo_unitario: d.costo_unitario,
        descuento: d.descuento,
        precio_lista: d.precio_lista,
        subtotal: d.subtotal,
        producto: d.producto ? {
          id: d.producto.id,
          codigo: d.producto.codigo,
          nombre: d.producto.nombre,
          descripcion: d.producto.descripcion,
          precio_compra: d.producto.precio_compra,
          precio_venta: d.producto.precio_venta
        } : undefined
      }));
      
      const draft = {
        tipo_operacion: operacion.tipo_operacion,
        sede_origen_id: operacion.sede_origen_id,
        sede_destino_id: operacion.sede_destino_id,
        proveedor_id: operacion.proveedor_id,
        cliente_id: operacion.cliente_id,
        personal_id: operacion.personal_id,
        fecha_emision: operacion.fecha_emision,
        referencia: operacion.referencia,
        detalles: detallesSimplificados
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [operacion, isInitialized]);

  const cargarCatalogos = async () => {
  try {
    const sedesRes = await operacionStockService.obtenerSedes();
    setSedes(sedesRes);
  } catch (error) {
    console.error('Error al cargar sedes:', error);
  }

  try {
    const proveedoresRes = await operacionStockService.obtenerProveedores();
    setProveedores(proveedoresRes);
  } catch (error) {
    console.error('Error al cargar proveedores:', error);
  }

  try {
    const clientesRes = await operacionStockService.obtenerClientes();
    setClientes(clientesRes);
  } catch (error) {
    console.error('Error al cargar clientes:', error);
  }

  try {
    const personalRes = await operacionStockService.obtenerPersonal();
    const personalActivo = personalRes.filter(p => p.activo !== false);
    setPersonal(personalActivo);
    if (personalActivo.length > 0) {
      setOperacion(prev => ({ 
        ...prev, 
        personal_id: personalActivo[0].id 
      }));
    }
  } catch (error) {
    console.error('Error al cargar personal:', error);
  }
};

const cargarEstadisticas = async () => {
  try {
    const stats = await operacionStockService.obtenerEstadisticas();
    setEstadisticas(stats);
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
};

  const handleTipoOperacionChange = (tipo: 'ENTRADA' | 'SALIDA' | 'TRASPASO') => {
    setOperacion(prev => ({
      ...prev,
      tipo_operacion: tipo,
      sede_origen_id: undefined,
      sede_destino_id: undefined,
      proveedor_id: undefined,
      cliente_id: undefined,
      motivo_traspaso: undefined,
      detalles: []
    }));
    limpiarMensajes();
  };

  const handleFieldChange = (field: keyof OperacionStock, value: any) => {
    setOperacion(prev => ({ ...prev, [field]: value }));
    limpiarMensajes();
  };

  const agregarDetalle = (detalle: DetalleOperacion) => {
    const detallesActuales = operacion.detalles || [];
    const existeProducto = detallesActuales.find(d => d.producto_id === detalle.producto_id);
    if (existeProducto) {
      setErrores(['El producto ya está en la lista']);
      return;
    }
    setOperacion(prev => ({
      ...prev,
      detalles: [...detallesActuales, detalle]
    }));
    limpiarMensajes();
  };

  const eliminarDetalle = (productoId: number) => {
    const detallesActuales = operacion.detalles || [];
    setOperacion(prev => ({
      ...prev,
      detalles: detallesActuales.filter(d => d.producto_id !== productoId)
    }));
  };

  const actualizarDetalle = (productoId: number, costo_unitario: number, subtotal: number) => {
    const detallesActuales = operacion.detalles || [];
    setOperacion(prev => ({
      ...prev,
      detalles: detallesActuales.map(d =>
        d.producto_id === productoId
          ? { ...d, costo_unitario, subtotal }
          : d
      )
    }));
  };

  const calcularTotales = () => {
    const detalles = operacion.detalles || [];
    const total_unidades = detalles.reduce((sum, d) => sum + d.cantidad, 0);
    const costo_total = detalles.reduce((sum, d) => sum + d.subtotal, 0);
    return { total_unidades, costo_total };
  };

  const validarOperacion = (): string[] => {
    const errs: string[] = [];
    if (!operacion.personal_id) errs.push('Debe seleccionar un responsable');
    if (!operacion.detalles || operacion.detalles.length === 0) errs.push('Debe agregar al menos un producto');
    const validacionTipo = operacionStockService.validarCamposPorTipo(operacion);
    if (!validacionTipo.valido) errs.push(validacionTipo.mensaje);
    return errs;
  };

  const procesarOperacion = async () => {
    const erroresValidacion = validarOperacion();
    if (erroresValidacion.length > 0) {
      setErrores(erroresValidacion);
      return;
    }
    // Validar configuración de cuotas si es crédito
    if (operacion.metodo_pago === 'credito' && cuotasConfig.numCuotas > 0) {
      if (cuotasConfig.garantiaTipo === 'dni' && cuotasConfig.garantiaValor.length !== 8) {
        setErrores(['El DNI del aval debe tener exactamente 8 dígitos']);
        return;
      }
      if (cuotasConfig.garantiaTipo === 'telefono' && cuotasConfig.garantiaValor.length !== 9) {
        setErrores(['El teléfono del aval debe tener exactamente 9 dígitos']);
        return;
      }
      if (cuotasConfig.garantiaTipo !== 'ninguna') {
        if (!cuotasConfig.avalNombre.trim()) {
          setErrores(['El nombre del aval es obligatorio']);
          return;
        }
        if (!cuotasConfig.avalDireccion.trim()) {
          setErrores(['La dirección / referencia del aval es obligatoria']);
          return;
        }
      }
      if (!cuotasConfig.primerVencimiento) {
        setErrores(['La fecha de primer vencimiento es requerida para ventas en cuotas']);
        return;
      }
    }
    setLoading(true);
    limpiarMensajes();
    try {
      const { total_unidades, costo_total } = calcularTotales();
      const operacionParaCrear = { 
        ...operacion, 
        total_unidades, 
        costo_total,
        // Incluir configuración de cuotas si es crédito
        ...(operacion.metodo_pago === 'credito' && cuotasConfig.numCuotas > 0 ? {
          num_cuotas: cuotasConfig.numCuotas,
          frecuencia_cuota: cuotasConfig.frecuencia,
          interes_mensual: cuotasConfig.interesMensual,
          primer_vencimiento: new Date(cuotasConfig.primerVencimiento),
          garantia_tipo: cuotasConfig.garantiaTipo,
          garantia_valor: cuotasConfig.garantiaValor,
          aval_nombre: cuotasConfig.avalNombre,
          aval_contacto: cuotasConfig.garantiaTipo === 'telefono' ? cuotasConfig.garantiaValor : cuotasConfig.avalContacto,
          aval_direccion: cuotasConfig.avalDireccion,
          responsable_cobro: cuotasConfig.responsableCobro,
        } : {})
      } as OperacionStock;
      
      const resultado = await operacionStockService.crearOperacion(operacionParaCrear);
      const operacionId = resultado.operacion?.id;
      
      if (operacionId) {
        await operacionStockService.procesarOperacion(operacionId);
      }
      
      setExito('Operación procesada exitosamente');
      cargarEstadisticas();
      setOperacion({
        tipo_operacion: operacion.tipo_operacion,
        fecha_emision: new Date(),
        personal_id: operacion.personal_id,
        metodo_pago: 'efectivo',
        detalles: []
      });
      resetCuotasConfig();
      localStorage.removeItem(STORAGE_KEY);
      if (onOperacionCreada) onOperacionCreada(resultado.operacion);
      
      // Generar PDF fuera del catch principal (popup bloqueado no debe mostrar error)
      try {
        generarPDFReal(resultado.operacion);
      } catch (pdfError) {
        console.warn('No se pudo abrir la previsualización del PDF (popup bloqueado?)', pdfError);
      }
    } catch (error: any) {
      const mensajeError = error.response?.data?.message || 'Error al procesar la operación';
      setErrores([mensajeError]);
    } finally {
      setLoading(false);
    }
  };

  const generarPDFReal = (operacionGuardada: any) => {
    const tipoOperacionLabel = {
      'ENTRADA': 'ENTRADA (COMPRA)',
      'SALIDA': 'SALIDA (VENTA)',
      'TRASPASO': 'TRASPASO'
    }[operacion.tipo_operacion || 'ENTRADA'];

    const sedeNombre = operacion.tipo_operacion === 'ENTRADA' || operacion.tipo_operacion === 'TRASPASO'
      ? sedes.find(s => s.id === operacion.sede_destino_id)?.nombre
      : sedes.find(s => s.id === operacion.sede_origen_id)?.nombre;

    let tercerosLabel = '';
    let tercerosNombre = '';
    if (operacion.tipo_operacion === 'ENTRADA') {
      tercerosLabel = 'Proveedor';
      tercerosNombre = proveedores.find(p => p.id === operacion.proveedor_id)?.nombre || '-';
    } else if (operacion.tipo_operacion === 'SALIDA') {
      tercerosLabel = 'Cliente';
      tercerosNombre = clientes.find(c => c.id === operacion.cliente_id)?.nombre || '-';
    }

    const responsableNombre = personal.find(p => p.id === operacion.personal_id)?.nombreCompleto || '-';
    const fechaEmision = operacion.fecha_emision 
      ? new Date(operacion.fecha_emision).toLocaleDateString('es-PE')
      : new Date().toLocaleDateString('es-PE');
    const fechaProcesamiento = new Date().toLocaleString('es-PE');

    const detallesHtml = (operacion.detalles || []).map(d => {
      const costo = Number(d.costo_unitario) || 0;
      const sub = Number(d.subtotal) || 0;
      return `
      <tr>
        <td>${d.producto?.codigo || ''}</td>
        <td>${d.producto?.nombre || ''}</td>
        <td style="text-align:center">S/ ${costo.toFixed(2)}</td>
        <td style="text-align:center">${d.cantidad}</td>
        <td style="text-align:center">S/ ${sub.toFixed(2)}</td>
      </tr>
    `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Operación de Stock #${operacionGuardada?.id || 'N/A'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          h1 { font-size: 24px; margin: 0; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .operacion-id { font-size: 14px; color: #666; }
          .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .info-item { margin-bottom: 10px; }
          .info-label { font-weight: bold; color: #555; font-size: 12px; }
          .info-value { font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 10px; font-size: 13px; }
          th { background: #f5f5f5; }
          .totales { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Operación de Stock</h1>
            <div class="operacion-id">ID: #${operacionGuardada?.id || 'N/A'}</div>
          </div>
          <div class="success-badge">✓ PROCESADO</div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">TIPO DE OPERACIÓN</div>
            <div class="info-value">${tipoOperacionLabel}</div>
          </div>
          <div class="info-item">
            <div class="info-label">FECHA DE EMISIÓN</div>
            <div class="info-value">${fechaEmision}</div>
          </div>
          <div class="info-item">
            <div class="info-label">FECHA DE PROCESAMIENTO</div>
            <div class="info-value">${fechaProcesamiento}</div>
          </div>
          <div class="info-item">
            <div class="info-label">RESPONSABLE FÍSICO</div>
            <div class="info-value">${responsableNombre}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${operacion.tipo_operacion === 'ENTRADA' || operacion.tipo_operacion === 'TRASPASO' ? 'SEDE DESTINO' : 'SEDE ORIGEN'}</div>
            <div class="info-value">${sedeNombre || '-'}</div>
          </div>
          ${tercerosLabel ? `
          <div class="info-item">
            <div class="info-label">${tercerosLabel.toUpperCase()}</div>
            <div class="info-value">${tercerosNombre}</div>
          </div>
          ` : ''}
          ${operacion.tipo_operacion === 'TRASPASO' ? `
          <div class="info-item">
            <div class="info-label">SEDE DESTINO</div>
            <div class="info-value">${sedes.find(s => s.id === operacion.sede_destino_id)?.nombre || '-'}</div>
          </div>
          ` : ''}
          <div class="info-item">
            <div class="info-label">REFERENCIA</div>
            <div class="info-value">${operacion.referencia || '-'}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th style="text-align:center">${operacion.tipo_operacion === 'SALIDA' ? 'Precio Unit.' : 'Costo Unit.'}</th>
              <th style="text-align:center">Cantidad</th>
              <th style="text-align:center">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detallesHtml}
          </tbody>
        </table>
        <div class="totales">
          TOTAL UNIDADES: ${operacionGuardada?.total_unidades || operacion.detalles?.length || 0} | ${operacion.tipo_operacion === 'SALIDA' ? 'TOTAL VENTA' : 'TOTAL'}: S/ ${(operacionGuardada?.costo_total || calcularTotales().costo_total).toFixed(2)}
        </div>
        <div class="footer">
          Documento generado automáticamente por el Sistema de Inventario CREDISA
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const limpiarFormulario = () => {
    setOperacion(prev => ({
      ...prev,
      sede_origen_id: undefined,
      sede_destino_id: undefined,
      proveedor_id: undefined,
      cliente_id: undefined,
      motivo_traspaso: undefined,
      referencia: '',
      detalles: []
    }));
    localStorage.removeItem(STORAGE_KEY);
    limpiarMensajes();
    setCuotasConfigurada(false);
  };

  const limpiarMensajes = () => {
    setErrores([]);
    setExito('');
  };

  // ─── Handlers para modal de cuotas ──────────────────────────────────────────
  const abrirCuotasModal = () => {
    // Pre-llenar fecha de primer vencimiento (mañana)
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    setCuotasConfig(prev => ({
      ...prev,
      primerVencimiento: mañana.toISOString().split('T')[0],
    }));
    setShowCuotasModal(true);
  };

  const cerrarCuotasModal = () => {
    setShowCuotasModal(false);
  };

  const handleCuotasConfigChange = (field: string, value: any) => {
    setCuotasConfig(prev => ({ ...prev, [field]: value }));
  };

  const guardarCuotasConfig = () => {
    if (cuotasConfig.garantiaTipo === 'dni' && cuotasConfig.garantiaValor.length !== 8) {
      setErrores(['El DNI del aval debe tener exactamente 8 dígitos']);
      return;
    }
    if (cuotasConfig.garantiaTipo === 'telefono' && cuotasConfig.garantiaValor.length !== 9) {
      setErrores(['El teléfono del aval debe tener exactamente 9 dígitos']);
      return;
    }
    if (cuotasConfig.garantiaTipo !== 'ninguna') {
      if (!cuotasConfig.avalNombre.trim()) {
        setErrores(['El nombre del aval es obligatorio']);
        return;
      }
      if (!cuotasConfig.avalDireccion.trim()) {
        setErrores(['La dirección / referencia del aval es obligatoria']);
        return;
      }
    }
    if (cuotasConfig.numCuotas < 1) {
      setErrores(['El número de cuotas debe ser al menos 1']);
      return;
    }
    if (!cuotasConfig.primerVencimiento) {
      setErrores(['La fecha de primer vencimiento es requerida']);
      return;
    }
    setCuotasConfigurada(true);
    cerrarCuotasModal();
  };

  const resetCuotasConfig = () => {
    setCuotasConfig({
      numCuotas: 3,
      frecuencia: 'mensual',
      primerVencimiento: '',
      interesMensual: 0,
      garantiaTipo: 'dni',
      garantiaValor: '',
      avalNombre: '',
      avalContacto: '',
      avalDireccion: '',
      responsableCobro: '',
    });
    setCuotasConfigurada(false);
  };

  const puedeAgregarProductos = (): boolean => {
    if (!operacion.tipo_operacion) return false;
    
    const tieneSede = operacion.tipo_operacion === 'ENTRADA' 
      ? !!operacion.sede_destino_id 
      : !!operacion.sede_origen_id;
    
    if (!tieneSede) return false;
    if (!operacion.personal_id) return false;
    if (!operacion.fecha_emision) return false;
    
    if (operacion.tipo_operacion === 'ENTRADA' && !operacion.proveedor_id) return false;
    if (operacion.tipo_operacion === 'SALIDA' && !operacion.cliente_id) return false;
    if (operacion.tipo_operacion === 'TRASPASO' && !operacion.sede_destino_id) return false;
    
    return true;
  };

  const validarCamposRequeridos = (): boolean => {
    if (!operacion.tipo_operacion) return false;
    
    const tieneSede = operacion.tipo_operacion === 'ENTRADA' 
      ? !!operacion.sede_destino_id 
      : !!operacion.sede_origen_id;
    
    if (!tieneSede) return false;
    if (!operacion.personal_id) return false;
    
    return true;
  };

  const generarPrevisualizacion = () => {
    if (operacion.detalles?.length === 0) {
      setErrores(['Agregue productos antes de imprimir']);
      return;
    }

    const tipoOperacionLabel = {
      'ENTRADA': 'ENTRADA (COMPRA)',
      'SALIDA': 'SALIDA (VENTA)',
      'TRASPASO': 'TRASPASO'
    }[operacion.tipo_operacion || 'ENTRADA'];

    const sedeNombre = operacion.tipo_operacion === 'ENTRADA' || operacion.tipo_operacion === 'TRASPASO'
      ? sedes.find(s => s.id === operacion.sede_destino_id)?.nombre
      : sedes.find(s => s.id === operacion.sede_origen_id)?.nombre;

    let tercerosLabel = '';
    let tercerosNombre = '';
    if (operacion.tipo_operacion === 'ENTRADA') {
      tercerosLabel = 'Proveedor';
      tercerosNombre = proveedores.find(p => p.id === operacion.proveedor_id)?.nombre || '-';
    } else if (operacion.tipo_operacion === 'SALIDA') {
      tercerosLabel = 'Cliente';
      tercerosNombre = clientes.find(c => c.id === operacion.cliente_id)?.nombre || '-';
    }

    const responsableNombre = personal.find(p => p.id === operacion.responsable_fisico_id)?.nombreCompleto || '-';
    const fechaEmision = operacion.fecha_emision 
      ? new Date(operacion.fecha_emision).toLocaleDateString('es-PE')
      : new Date().toLocaleDateString('es-PE');

    const detallesHtml = (operacion.detalles || []).map(d => {
      const costo = Number(d.costo_unitario) || 0;
      const sub = Number(d.subtotal) || 0;
      return `
      <tr>
        <td>${d.producto?.codigo || ''}</td>
        <td>${d.producto?.nombre || ''}</td>
        <td style="text-align:center">S/ ${costo.toFixed(2)}</td>
        <td style="text-align:center">${d.cantidad}</td>
        <td style="text-align:center">S/ ${sub.toFixed(2)}</td>
      </tr>
    `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vista Previa - Operación de Stock</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .info-item { margin-bottom: 10px; }
          .info-label { font-weight: bold; color: #555; font-size: 12px; }
          .info-value { font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 10px; font-size: 13px; }
          th { background: #f5f5f5; }
          .totales { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
            font-size: 80px; color: rgba(200,200,200,0.3); pointer-events: none; }
          @media print { body { padding: 20px; } .watermark { display: none; } }
        </style>
      </head>
      <body>
        <div class="watermark">VISTA PREVIA</div>
        <h1>Operación de Stock</h1>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">TIPO DE OPERACIÓN</div>
            <div class="info-value">${tipoOperacionLabel}</div>
          </div>
          <div class="info-item">
            <div class="info-label">FECHA DE EMISIÓN</div>
            <div class="info-value">${fechaEmision}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${operacion.tipo_operacion === 'ENTRADA' || operacion.tipo_operacion === 'TRASPASO' ? 'SEDE DESTINO' : 'SEDE ORIGEN'}</div>
            <div class="info-value">${sedeNombre || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">RESPONSABLE FÍSICO</div>
            <div class="info-value">${responsableNombre}</div>
          </div>
          ${tercerosLabel ? `
          <div class="info-item">
            <div class="info-label">${tercerosLabel.toUpperCase()}</div>
            <div class="info-value">${tercerosNombre}</div>
          </div>
          ` : ''}
          ${operacion.tipo_operacion === 'TRASPASO' ? `
          <div class="info-item">
            <div class="info-label">SEDE DESTINO</div>
            <div class="info-value">${sedes.find(s => s.id === operacion.sede_destino_id)?.nombre || '-'}</div>
          </div>
          ` : ''}
          <div class="info-item">
            <div class="info-label">REFERENCIA</div>
            <div class="info-value">${operacion.referencia || '-'}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th style="text-align:center">${operacion.tipo_operacion === 'SALIDA' ? 'Precio Unit.' : 'Costo Unit.'}</th>
              <th style="text-align:center">Cantidad</th>
              <th style="text-align:center">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detallesHtml}
          </tbody>
        </table>
        <div class="totales">
          TOTAL UNIDADES: ${total_unidades} | ${operacion.tipo_operacion === 'SALIDA' ? 'TOTAL VENTA' : 'TOTAL'}: S/ ${costo_total.toFixed(2)}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const { total_unidades, costo_total } = calcularTotales();

  // ─── Helpers para íconos y badges ────────────────────────────────────────────
  const getTipoIcon = (tipo: string) => {
    if (tipo === 'ENTRADA') return '↓';
    if (tipo === 'SALIDA') return '↑';
    return '⇄';
  };

  const getTipoClass = (tipo: string) => {
    if (tipo === 'ENTRADA') return 'tipo-entrada';
    if (tipo === 'SALIDA') return 'tipo-salida';
    return 'tipo-traspaso';
  };

  // ─── Renderizado de fila 1: campos que cambian según tipo ────────────────────
  // Fila 1 columna 2: sede principal
  const renderSedePrincipal = () => {
    if (operacion.tipo_operacion === 'ENTRADA') {
      return (
        <div className="os-field-group">
          <label className="os-label">
            <i className="bx bx-map os-label-icon"></i> Sede Destino (Entra en)
          </label>
          <div className="os-select-wrapper">
            <select
              className="os-select"
              value={operacion.sede_destino_id || ''}
              onChange={(e) => handleFieldChange('sede_destino_id', Number(e.target.value))}
            >
              <option value="">Seleccionar Sede...</option>
              {sedes.filter(s => s.estado === 'activo').map(sede => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
            <span className="os-select-arrow">▾</span>
          </div>
        </div>
      );
    }
    // SALIDA y TRASPASO muestran Sede Origen
    return (
      <div className="os-field-group">
          <label className="os-label">
            <i className="bx bx-map os-label-icon"></i> Sede Origen (Sale de)
          </label>
        <div className="os-select-wrapper">
          <select
            className="os-select"
            value={operacion.sede_origen_id || ''}
            onChange={(e) => handleFieldChange('sede_origen_id', Number(e.target.value))}
          >
            <option value="">Seleccionar Sede...</option>
            {sedes.filter(s => s.estado === 'activo').map(sede => (
              <option key={sede.id} value={sede.id}>{sede.nombre}</option>
            ))}
          </select>
          <span className="os-select-arrow">▾</span>
        </div>
      </div>
    );
  };

  // Fila 2 columna 2: campo secundario
  const renderCampoSecundario = (habilitado: boolean) => {
    switch (operacion.tipo_operacion) {
      case 'ENTRADA':
        return (
          <div className="os-field-group">
            <label className="os-label">
              <i className="bx bx-user os-label-icon"></i> Proveedor
            </label>
            <div className="os-select-wrapper">
              <select
                className={`os-select ${!habilitado ? 'os-input-disabled' : ''}`}
                value={operacion.proveedor_id || ''}
                onChange={(e) => handleFieldChange('proveedor_id', Number(e.target.value))}
                disabled={!habilitado}
              >
                <option value="">Seleccionar Proveedor...</option>
                {proveedores.filter(p => p.estado === 'activo').map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        );
      case 'SALIDA':
        return (
          <div className="os-field-group">
            <label className="os-label">
              <i className="bx bx-user os-label-icon"></i> Cliente
            </label>
            <div className="os-select-wrapper">
              <select
                className={`os-select ${!habilitado ? 'os-input-disabled' : ''}`}
                value={operacion.cliente_id || ''}
                onChange={(e) => handleFieldChange('cliente_id', Number(e.target.value))}
                disabled={!habilitado}
              >
                <option value="">Seleccionar Cliente...</option>
                {clientes.filter(c => c.estado).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} - {c.documento}</option>
                ))}
              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        );
      case 'TRASPASO':
        return (
          <div className="os-field-group">
            <label className="os-label os-label-highlight">
              <i className="bx bx-map os-label-icon"></i> Hacia Sede Destino
            </label>
            <div className="os-select-wrapper os-select-wrapper-highlight">
              <select
                className={`os-select os-select-highlight ${!habilitado ? 'os-input-disabled' : ''}`}
                value={operacion.sede_destino_id || ''}
                onChange={(e) => handleFieldChange('sede_destino_id', Number(e.target.value))}
                disabled={!habilitado}
              >
                <option value="">Seleccionar Destino...</option>
                {sedes.filter(s => s.estado === 'activo').map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="os-page">
      {/* ── Header ── */}
      <div className="os-page-header">
        <div className="os-page-title-block">
          <h1 className="module-title">Operaciones de Stock</h1>
          <p className="module-subtitle">Registra entradas, salidas y traspasos entre almacenes.</p>
        </div>
        <div className="os-page-actions">
          <button className="os-btn os-btn-ghost" onClick={limpiarFormulario} disabled={loading}>
            <i className="bx bx-reset os-btn-icon"></i> Limpiar
          </button>
          <button className="os-btn os-btn-outline" onClick={generarPrevisualizacion} disabled={loading || (operacion.detalles?.length === 0)}>
            <i className="bx bx-printer os-btn-icon"></i> Imprimir
          </button>
          {operacion.tipo_operacion === 'SALIDA' && operacion.metodo_pago === 'credito' && (
            <button 
              type="button" 
              className="os-btn os-btn-outline" 
              onClick={abrirCuotasModal}
              disabled={loading}
            >
              <i className="bx bx-calendar-edit os-btn-icon"></i> Configurar cuotas
            </button>
          )}
          <button
            className="os-btn os-btn-primary"
            onClick={procesarOperacion}
            disabled={loading || (operacion.metodo_pago === 'credito' && !cuotasConfigurada)}
            title={operacion.metodo_pago === 'credito' && !cuotasConfigurada ? 'Configura primero las cuotas para procesar el movimiento' : undefined}
          >
            {loading ? (
              <><span className="os-spinner"></span> Procesando...</>
            ) : (
              <><i className="bx bx-check-circle os-btn-icon"></i> Procesar Movimiento</>
            )}
          </button>
        </div>
      </div>

      {/* ── Alertas ── */}
      {errores.length > 0 && (
        <div className="os-alert os-alert-error">
          {errores.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
      {exito && <div className="os-alert os-alert-success">{exito}</div>}

      {/* ── KPIs Resumen ── */}
      {estadisticas && (
        <div className="os-kpi-row">
          <div className="os-kpi-card">
            <div className="os-kpi-icon"><i className="bx bx-calendar-check"></i></div>
            <div className="os-kpi-info">
              <span className="os-kpi-value">{estadisticas.hoy.entradas}</span>
              <span className="os-kpi-label">Entradas hoy</span>
            </div>
          </div>
          <div className="os-kpi-card">
            <div className="os-kpi-icon os-kpi-icon-danger"><i className="bx bx-calendar-minus"></i></div>
            <div className="os-kpi-info">
              <span className="os-kpi-value">{estadisticas.hoy.salidas}</span>
              <span className="os-kpi-label">Salidas hoy</span>
            </div>
          </div>
          <div className="os-kpi-card">
            <div className="os-kpi-icon os-kpi-icon-warning"><i className="bx bx-dollar"></i></div>
            <div className="os-kpi-info">
              <span className="os-kpi-value">S/ {estadisticas.mes.costoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
              <span className="os-kpi-label">Costo total mes</span>
            </div>
          </div>
          <div className="os-kpi-card">
            <div className="os-kpi-icon os-kpi-icon-purple"><i className="bx bx-package"></i></div>
            <div className="os-kpi-info">
              <span className="os-kpi-value">{estadisticas.mes.unidadesTotales}</span>
              <span className="os-kpi-label">Unidades mes</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sección principal: campos del formulario ── */}
      <div className="os-card">
        {/* Fila 1 */}
        <div className="os-form-row os-form-row-3">
          {/* Tipo Operación */}
          <div className="os-field-group">
          <label className="os-label">
            <i className="bx bx-transfer os-label-icon"></i> Tipo de Operación
          </label>
            <div className="os-select-wrapper">
              <select
                className={`os-select os-select-tipo ${getTipoClass(operacion.tipo_operacion || 'ENTRADA')}`}
                value={operacion.tipo_operacion}
                onChange={(e) => handleTipoOperacionChange(e.target.value as any)}
              >
                <option value="ENTRADA">ENTRADA</option>
                <option value="SALIDA">SALIDA</option>
                <option value="TRASPASO">TRASPASO</option>
              </select>
              <span className="os-tipo-badge">{getTipoIcon(operacion.tipo_operacion || 'ENTRADA')}</span>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>

          {/* Sede principal (cambia según tipo) */}
          <React.Fragment key={`sede-${operacion.tipo_operacion}`}>
            {renderSedePrincipal()}
          </React.Fragment>

          {/* Responsable Físico */}
          <div className="os-field-group">
          <label className="os-label">
            <i className="bx bx-user os-label-icon"></i> Responsable Físico
          </label>
            <div className="os-select-wrapper">
              <select
                className="os-select"
                value={operacion.personal_id || ''}
                onChange={(e) => handleFieldChange('personal_id', Number(e.target.value))}
              >
                <option value="">¿Quién ejecutó?</option>
                {personal && personal.length > 0 ? (
                  personal.map(p => (
                    <option key={p.id} value={p.id}>{p.nombreCompleto} ({p.cargo})</option>
                  ))
                ) : null}
                              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        </div>

{/* Fila 2 */}
        <div className="os-form-row os-form-row-4">
          {/* Fecha de Emisión */}
          <div className="os-field-group">
          <label className="os-label">
            <i className="bx bx-calendar os-label-icon"></i> Fecha de Emisión
          </label>
            <input
              type="date"
              className={`os-input ${!validarCamposRequeridos() ? 'os-input-disabled' : ''}`}
              value={operacion.fecha_emision ? new Date(operacion.fecha_emision).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFieldChange('fecha_emision', new Date(e.target.value))}
              disabled={!validarCamposRequeridos()}
            />
          </div>

          {/* Campo secundario (cambia según tipo) */}
          <React.Fragment key={operacion.tipo_operacion}>
            {renderCampoSecundario(validarCamposRequeridos())}
          </React.Fragment>

          {/* Método de Pago (solo para SALIDA) */}
          {operacion.tipo_operacion === 'SALIDA' && (
            <div className="os-field-group">
              <label className="os-label">
                <i className="bx bx-credit-card os-label-icon"></i> Método de Pago
              </label>
              <div className="os-select-wrapper">
                <select
                  className="os-select"
                  value={operacion.metodo_pago || 'efectivo'}
                  onChange={(e) => handleFieldChange('metodo_pago', e.target.value)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="credito">Crédito (Cuotas)</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
                <span className="os-select-arrow">▾</span>
              </div>
            </div>
          )}

          {/* Referencia / Comentario */}
          <div className="os-field-group">
            <label className="os-label">
              <i className="bx bx-note os-label-icon"></i> Referencia / Comentario
            </label>
            <input
              type="text"
              className="os-input"
              placeholder="Ej: Factura F001 / Ajuste"
              value={operacion.referencia || ''}
              onChange={(e) => handleFieldChange('referencia', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Sección de producto ── */}
      <div className="os-card os-card-product">
        <ProductoSelector
          onProductoSeleccionado={agregarDetalle}
          operacion={operacion}
          habilitado={puedeAgregarProductos()}
        />
      </div>

      {/* ── Tabla de detalles ── */}
      <div className="os-card os-card-table">
        <TablaDetalles
          detalles={operacion.detalles || []}
          onEliminarDetalle={eliminarDetalle}
          onActualizarDetalle={actualizarDetalle}
          tipoOperacion={operacion.tipo_operacion}
        />

        {/* Totales */}
        <div className="os-totales">
          <div className="os-total-item">
            <span className="os-total-label">TOTAL UNIDADES</span>
            <span className="os-total-value">{total_unidades}</span>
          </div>
          <div className="os-total-item">
            <span className="os-total-label">{operacion.tipo_operacion === 'SALIDA' ? 'TOTAL VENTA' : 'COSTO TOTAL'}</span>
            <span className="os-total-value os-total-value-money">S/ {costo_total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    
      {/* ── Modal Configurar Cuotas ── */}
      <CuotasModal
        isOpen={showCuotasModal}
        onClose={cerrarCuotasModal}
        onSave={guardarCuotasConfig}
        config={cuotasConfig}
        onChange={handleCuotasConfigChange}
        errors={errores}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductoSelector
// ─────────────────────────────────────────────────────────────────────────────
const ProductoSelector: React.FC<{
  onProductoSeleccionado: (detalle: DetalleOperacion) => void;
  operacion: Partial<OperacionStock>;
  habilitado?: boolean;
}> = ({ onProductoSeleccionado, operacion, habilitado = true }) => {
  const [termino, setTermino] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState(1);
  const [descuento, setDescuento] = useState(0);
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Precio de lista y precio final calculado
  const precioLista = productoSeleccionado
    ? (operacion.tipo_operacion === 'SALIDA'
        ? productoSeleccionado.precio_venta
        : productoSeleccionado.precio_compra)
    : 0;
  const precioFinal = precioLista * (1 - descuento / 100);

  // Promo activa del producto: solo aplica en SALIDA (venta al cliente)
  const promoAplicada = operacion.tipo_operacion === 'SALIDA' && !!productoSeleccionado && esPromoActiva(productoSeleccionado);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setProductos([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (termino.length >= 2) buscarProductos(termino);
      else setProductos([]);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termino]);

  const buscarProductos = async (terminoBusqueda: string) => {
    setLoading(true);
    try {
      let sedeId: number | undefined;
      if (operacion.tipo_operacion === 'SALIDA' || operacion.tipo_operacion === 'TRASPASO') {
        sedeId = operacion.sede_origen_id;
      } else if (operacion.tipo_operacion === 'ENTRADA') {
        sedeId = operacion.sede_destino_id;
      }
      const resultados = await operacionStockService.buscarProductos(terminoBusqueda, sedeId);
      setProductos(resultados);
    } catch (error) {
      console.error('Error al buscar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductoSeleccionado = async (producto: any) => {
    setProductoSeleccionado(producto);
    setTermino(producto.nombre);
    setProductos([]);
    setCantidad(1);
    const promo = operacion.tipo_operacion === 'SALIDA' && esPromoActiva(producto);
    setDescuento(promo ? Number(producto.descuento_promocion) : 0);
    try {
      let sedeId: number | undefined;
      if (operacion.tipo_operacion === 'SALIDA' || operacion.tipo_operacion === 'TRASPASO') {
        sedeId = operacion.sede_origen_id;
      } else if (operacion.tipo_operacion === 'ENTRADA') {
        sedeId = operacion.sede_destino_id;
      }
      if (sedeId) {
        const stock = await operacionStockService.obtenerStockDisponible(producto.id, sedeId);
        setStockDisponible(stock.cantidad_actual);
      } else {
        setStockDisponible(producto.stock_disponible ?? 0);
      }
    } catch {
      setStockDisponible(0);
    }
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) return;
    const precioLista = operacion.tipo_operacion === 'SALIDA'
      ? productoSeleccionado.precio_venta
      : productoSeleccionado.precio_compra;
    const precioFinal = precioLista * (1 - descuento / 100);
    const detalle: DetalleOperacion = {
      producto_id: productoSeleccionado.id,
      cantidad,
      costo_unitario: Number(precioFinal.toFixed(2)),
      descuento,
      precio_lista: precioLista,
      subtotal: cantidad * Number(precioFinal.toFixed(2)),
      producto: productoSeleccionado
    };
    onProductoSeleccionado(detalle);
    setProductoSeleccionado(null);
    setTermino('');
    setCantidad(1);
    setDescuento(0);
    setStockDisponible(null);
  };

  const esOperacionConStock = operacion.tipo_operacion === 'SALIDA' || operacion.tipo_operacion === 'TRASPASO';
  const stockInsuficiente = esOperacionConStock && stockDisponible !== null && stockDisponible === 0;
  const cantidadDeshabilitada = !productoSeleccionado || stockInsuficiente || !habilitado;
  const botonDeshabilitado = !productoSeleccionado || cantidad <= 0 || stockInsuficiente || !habilitado;

  return (
    <div className="os-product-row">
      {/* Búsqueda */}
      <div className="os-product-search" ref={wrapperRef}>
        <label className="os-label">Producto {!habilitado && <span style={{fontSize:'0.7em', color:'#999'}}>(complete campos superiores)</span>}</label>
        <div className="os-product-input-wrap">
          <input
            type="text"
            className={`os-input os-input-product ${!habilitado ? 'os-input-disabled' : ''}`}
            placeholder="Buscar por nombre o código..."
            value={termino}
            disabled={!habilitado}
            onChange={(e) => {
              setTermino(e.target.value);
              if (!e.target.value) setProductoSeleccionado(null);
            }}
          />
          <span className="os-product-arrows">⌄⌃</span>
          {loading && <span className="os-product-loading"></span>}

          {productos.length > 0 && (
            <div className="os-product-dropdown">
              {productos.map(p => (
                <div
                  key={p.id}
                  className="os-product-item"
                  onMouseDown={() => handleProductoSeleccionado(p)}
                >
                  <span className="os-product-item-name">{p.nombre}</span>
                  <span className="os-product-item-meta">{p.codigo} · Stock: {p.stock_disponible}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disponible */}
      <div className="os-product-field">
        <label className="os-label">Disponible</label>
        <input
          type="text"
          className="os-input os-input-sm"
          value={stockDisponible !== null ? stockDisponible : '-'}
          readOnly
          disabled
        />
      </div>

      {/* Cantidad */}
      <div className="os-product-field">
        <label className="os-label">Cantidad</label>
        <input
          type="number"
          className={`os-input os-input-sm ${stockInsuficiente ? 'os-input-disabled' : ''}`}
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
          disabled={cantidadDeshabilitada}
        />
      </div>

      {/* Descuento % */}
      <div className="os-product-field">
        <label className="os-label">Desc. %</label>
        <input
          type="number"
          className={`os-input os-input-sm ${stockInsuficiente ? 'os-input-disabled' : ''}`}
          min="0"
          max="100"
          step="0.01"
          value={descuento}
          onChange={(e) => {
            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            setDescuento(val);
          }}
          disabled={cantidadDeshabilitada}
        />
        {promoAplicada && productoSeleccionado && (
          <span className="os-promo-hint">
            🔥 Promo -{Number(productoSeleccionado.descuento_promocion).toFixed(0)}%
            {productoSeleccionado.promocion_hasta
              ? ` hasta ${new Date(productoSeleccionado.promocion_hasta).toLocaleDateString('es-PE')}`
              : ''}
          </span>
        )}
      </div>

      {/* Precio Final */}
      <div className="os-product-field">
        <label className="os-label">Precio Final</label>
        <input
          type="text"
          className="os-input os-input-sm"
          value={precioFinal > 0 ? `S/ ${precioFinal.toFixed(2)}` : '-'}
          readOnly
          disabled
        />
      </div>

      {/* Agregar */}
      <div className="os-product-field os-product-field-btn">
        <label className="os-label">&nbsp;</label>
        <button
          className={`os-btn os-btn-primary os-btn-agregar ${stockInsuficiente ? 'os-btn-disabled' : ''}`}
          onClick={agregarProducto}
          disabled={botonDeshabilitado}
        >
          {stockInsuficiente ? 'Sin stock' : '+ Agregar'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TablaDetalles
// ─────────────────────────────────────────────────────────────────────────────
const TablaDetalles: React.FC<{
  detalles: DetalleOperacion[];
  onEliminarDetalle: (productoId: number) => void;
  onActualizarDetalle: (productoId: number, costo_unitario: number, subtotal: number) => void;
  tipoOperacion?: 'ENTRADA' | 'SALIDA' | 'TRASPASO';
}> = ({ detalles, onEliminarDetalle, onActualizarDetalle, tipoOperacion }) => {
  const headerPrecio = tipoOperacion === 'SALIDA' ? 'Precio Unit.' : 'Costo Unit.';

  const handlePrecioChange = (productoId: number, cantidad: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoPrecio = Math.max(0, Number(e.target.value) || 0);
    const nuevoSubtotal = cantidad * nuevoPrecio;
    onActualizarDetalle(productoId, nuevoPrecio, nuevoSubtotal);
  };

  return (
    <div className="os-table-wrap">
      <table className="os-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Precio Lista</th>
            <th>Desc. %</th>
            <th>{headerPrecio} <span className="os-editable-hint">✏️</span></th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {detalles.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <div className="os-table-empty">
                  <i className="bx bx-package os-table-empty-icon"></i>
                  <span className="os-table-empty-text">Lista vacía. Selecciona un producto arriba.</span>
                </div>
              </td>
            </tr>
          ) : (
            detalles.map((d, i) => {
              const costo = Number(d.costo_unitario) || 0;
              const precioLista = Number(d.precio_lista) || 0;
              const descuento = Number(d.descuento) || 0;
              const sub = Number(d.subtotal) || 0;
              return <tr key={d.producto_id || i}>
                <td>{d.producto?.codigo || ''}</td>
                <td>{d.producto?.nombre || ''}</td>
                <td>S/ {precioLista.toFixed(2)}</td>
                <td>
                  {descuento > 0 && (
                    <span className="os-descuento-badge">-{descuento.toFixed(2)}%</span>
                  )}
                  {descuento === 0 && <span className="os-text-muted">—</span>}
                </td>
                <td>
                  <input
                    type="number"
                    className="os-input os-input-price"
                    min="0"
                    step="0.01"
                    value={costo.toFixed(2)}
                    onChange={(e) => handlePrecioChange(d.producto_id, d.cantidad, e)}
                  />
                </td>
                <td>{d.cantidad}</td>
                <td>S/ {sub.toFixed(2)}</td>
                <td>
                  <button
                    className="os-btn-delete"
                    onClick={() => onEliminarDetalle(d.producto_id)}
                    title="Eliminar"
                  >
                    <i className="bx bx-x"></i>
                  </button>
                </td>
              </tr>;
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OperacionesStock;

// ─────────────────────────────────────────────────────────────────────────────
// Modal Configurar Cuotas
// ─────────────────────────────────────────────────────────────────────────────
const CuotasModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  config: {
    numCuotas: number;
    frecuencia: 'semanal' | 'quincenal' | 'mensual';
    primerVencimiento: string;
    interesMensual: number;
    garantiaTipo: 'dni' | 'telefono' | 'ninguna';
    garantiaValor: string;
    avalNombre: string;
    avalContacto: string;
    avalDireccion: string;
    responsableCobro: string;
  };
  onChange: (field: string, value: any) => void;
  errors: string[];
}> = ({ isOpen, onClose, onSave, config, onChange, errors }) => {
  if (!isOpen) return null;

  return (
    <Modal title="Configurar venta en cuotas" isOpen={isOpen} onClose={onClose} size="large">
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        {errors.length > 0 && (
          <div className="os-alert os-alert-error" style={{ marginBottom: '16px' }}>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
        <div className="os-form-row os-form-row-2">
          <div className="os-field-group">
            <label className="os-label">N° de cuotas *</label>
            <input
              type="number"
              className="os-input"
              min="1"
              max="36"
              value={config.numCuotas}
              onChange={(e) => onChange('numCuotas', Number(e.target.value))}
              required
            />
          </div>
          <div className="os-field-group">
            <label className="os-label">Frecuencia *</label>
            <div className="os-select-wrapper">
              <select
                className="os-select"
                value={config.frecuencia}
                onChange={(e) => onChange('frecuencia', e.target.value)}
              >
                <option value="mensual">Mensual (día fijo cada mes)</option>
                <option value="quincenal">Quincenal (cada 15 días)</option>
                <option value="semanal">Semanal (cada 7 días)</option>
              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        </div>

        <div className="os-form-row os-form-row-2">
          <div className="os-field-group">
            <label className="os-label">Fecha 1er vencimiento *</label>
            <input
              type="date"
              className="os-input"
              value={config.primerVencimiento}
              onChange={(e) => onChange('primerVencimiento', e.target.value)}
              required
            />
          </div>
          <div className="os-field-group">
            <label className="os-label">Interés mensual %</label>
            <input
              type="number"
              className="os-input"
              min="0"
              max="100"
              step="0.01"
              value={config.interesMensual}
              onChange={(e) => onChange('interesMensual', Number(e.target.value) || 0)}
              placeholder="0 = sin interés"
            />
          </div>
        </div>

        <hr style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />
        <h4 style={{ marginBottom: '12px', color: '#374151' }}>Información de Garantía / Aval</h4>

        <div className="os-form-row os-form-row-2">
          <div className="os-field-group">
            <label className="os-label">Tipo de garantía</label>
            <div className="os-select-wrapper">
              <select
                className="os-select"
                value={config.garantiaTipo}
                onChange={(e) => {
                  onChange('garantiaTipo', e.target.value);
                  onChange('garantiaValor', '');
                }}
              >
                <option value="dni">DNI del aval</option>
                <option value="telefono">Teléfono del aval</option>
                <option value="ninguna">Sin garantía</option>
              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        </div>

        {config.garantiaTipo !== 'ninguna' && (
          <>
            <div className="os-form-row os-form-row-2">
              <div className="os-field-group">
                <label className="os-label">
                  {config.garantiaTipo === 'dni' ? 'DNI del aval' : 'Teléfono del aval'} *
                </label>
                <input
                  type="text"
                  className="os-input"
                  value={config.garantiaValor}
                  onChange={(e) => onChange('garantiaValor', e.target.value.replace(/\D/g, ''))}
                  placeholder={config.garantiaTipo === 'dni' ? '8 dígitos' : '9 dígitos'}
                  required
                  maxLength={config.garantiaTipo === 'dni' ? 8 : 9}
                />
              </div>
              <div className="os-field-group">
                <label className="os-label">Nombre del aval / garante</label>
                <input
                  type="text"
                  className="os-input"
                  value={config.avalNombre}
                  onChange={(e) => onChange('avalNombre', e.target.value)}
                  placeholder="Nombre completo del garante"
                  required
                />
              </div>
            </div>

            <div className="os-form-row os-form-row-2">
              <div className="os-field-group">
                <label className="os-label">Dirección / Referencia del aval</label>
                <textarea
                  className="os-input"
                  value={config.avalDireccion}
                  onChange={(e) => onChange('avalDireccion', e.target.value.replace(/\d/g, ''))}
                  placeholder="Dirección de domicilio, referencias para ubicar..."
                  rows={2}
                  required
                />
              </div>
              <div className="os-field-group">
                <label className="os-label">Responsable de cobro (interno)</label>
                <input
                  type="text"
                  className="os-input"
                  value={config.responsableCobro}
                  onChange={(e) => onChange('responsableCobro', e.target.value)}
                  placeholder="Empleado que hará seguimiento"
                />
              </div>
            </div>
          </>
        )}

        <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="os-btn os-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="os-btn os-btn-primary">
            Guardar configuración
          </button>
        </div>
      </form>
    </Modal>
  );
};