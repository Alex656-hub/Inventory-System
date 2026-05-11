import React, { useState, useEffect, useRef } from 'react';
import { OperacionStock, DetalleOperacion, Sede, Proveedor, Cliente, User } from '../services/operacionStock.service';
import operacionStockService from '../services/operacionStock.service';
import './OperacionesStock.css';

interface OperacionesStockProps {
  onOperacionCreada?: (operacion: OperacionStock) => void;
}

const OperacionesStock: React.FC<OperacionesStockProps> = ({ onOperacionCreada }) => {
  const [operacion, setOperacion] = useState<Partial<OperacionStock>>({
    tipo_operacion: 'ENTRADA',
    fecha_emision: new Date(),
    responsable_fisico_id: 0,
    detalles: []
  });

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [exito, setExito] = useState<string>('');

  useEffect(() => {
    cargarCatalogos();
  }, []);

  useEffect(() => {
    console.log('Estado usuarios actualizado:', usuarios);
    console.log('¿Es array?', Array.isArray(usuarios));
  }, [usuarios]);

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
    const usuariosRes = await operacionStockService.obtenerUsuarios();
    setUsuarios(usuariosRes);
    if (usuariosRes.length > 0) {
      setOperacion(prev => ({ 
        ...prev, 
        responsable_fisico_id: usuariosRes[0].id 
      }));
    }
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
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

  const calcularTotales = () => {
    const detalles = operacion.detalles || [];
    const total_unidades = detalles.reduce((sum, d) => sum + d.cantidad, 0);
    const costo_total = detalles.reduce((sum, d) => sum + d.subtotal, 0);
    return { total_unidades, costo_total };
  };

  const validarOperacion = (): string[] => {
    const errs: string[] = [];
    if (!operacion.responsable_fisico_id) errs.push('Debe seleccionar un responsable');
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
    setLoading(true);
    limpiarMensajes();
    try {
      const { total_unidades, costo_total } = calcularTotales();
      const operacionParaCrear = { ...operacion, total_unidades, costo_total } as OperacionStock;
      const resultado = await operacionStockService.crearOperacion(operacionParaCrear);
      setExito('Operación creada exitosamente');
      setOperacion({
        tipo_operacion: operacion.tipo_operacion,
        fecha_emision: new Date(),
        responsable_fisico_id: operacion.responsable_fisico_id,
        detalles: []
      });
      if (onOperacionCreada) onOperacionCreada(resultado.operacion);
    } catch (error: any) {
      const mensajeError = error.response?.data?.message || 'Error al procesar la operación';
      setErrores([mensajeError]);
    } finally {
      setLoading(false);
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
    limpiarMensajes();
  };

  const limpiarMensajes = () => {
    setErrores([]);
    setExito('');
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
            <i className="os-label-icon">📍</i> Sede Destino (Entra en)
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
          <i className="os-label-icon">📍</i> Sede Origen (Sale de)
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
  const renderCampoSecundario = () => {
    switch (operacion.tipo_operacion) {
      case 'ENTRADA':
        return (
          <div className="os-field-group">
            <label className="os-label">
              <i className="os-label-icon">👤</i> Proveedor
            </label>
            <div className="os-select-wrapper">
              <select
                className="os-select"
                value={operacion.proveedor_id || ''}
                onChange={(e) => handleFieldChange('proveedor_id', Number(e.target.value))}
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
              <i className="os-label-icon">👤</i> Cliente
            </label>
            <div className="os-select-wrapper">
              <select
                className="os-select"
                value={operacion.cliente_id || ''}
                onChange={(e) => handleFieldChange('cliente_id', Number(e.target.value))}
              >
                <option value="">Seleccionar Cliente...</option>
                {clientes.filter(c => c.estado === 'activo').map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} - {c.numero_documento}</option>
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
              <i className="os-label-icon">📍</i> Hacia Sede Destino
            </label>
            <div className="os-select-wrapper os-select-wrapper-highlight">
              <select
                className="os-select os-select-highlight"
                value={operacion.sede_destino_id || ''}
                onChange={(e) => handleFieldChange('sede_destino_id', Number(e.target.value))}
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
          <h1 className="os-page-title">Operaciones de Stock</h1>
          <p className="os-page-subtitle">Registra entradas, salidas y traspasos entre almacenes.</p>
        </div>
        <div className="os-page-actions">
          <button className="os-btn os-btn-ghost" onClick={limpiarFormulario} disabled={loading}>
            <span className="os-btn-icon">↺</span> Limpiar
          </button>
          <button className="os-btn os-btn-outline" disabled={loading || !operacion.id}>
            <span className="os-btn-icon">🖨</span> Imprimir
          </button>
          <button className="os-btn os-btn-primary" onClick={procesarOperacion} disabled={loading}>
            {loading ? (
              <><span className="os-spinner"></span> Procesando...</>
            ) : (
              <><span className="os-btn-icon">✦</span> Procesar Movimiento</>
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

      {/* ── Sección principal: campos del formulario ── */}
      <div className="os-card">
        {/* Fila 1 */}
        <div className="os-form-row os-form-row-3">
          {/* Tipo Operación */}
          <div className="os-field-group">
            <label className="os-label">
              <i className="os-label-icon">⇄</i> Tipo de Operación
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
              <i className="os-label-icon">👤</i> Responsable Físico
            </label>
            <div className="os-select-wrapper">
              <select
                className="os-select"
                value={operacion.responsable_fisico_id || ''}
                onChange={(e) => handleFieldChange('responsable_fisico_id', Number(e.target.value))}
              >
                <option value="">¿Quién ejecutó?</option>
                {usuarios && usuarios.length > 0 ? (
                  usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))
                ) : null}
                              </select>
              <span className="os-select-arrow">▾</span>
            </div>
          </div>
        </div>

        {/* Fila 2 */}
        <div className="os-form-row os-form-row-3">
          {/* Fecha de Emisión */}
          <div className="os-field-group">
            <label className="os-label">
              <i className="os-label-icon">📅</i> Fecha de Emisión
            </label>
            <input
              type="date"
              className="os-input"
              value={operacion.fecha_emision ? new Date(operacion.fecha_emision).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFieldChange('fecha_emision', new Date(e.target.value))}
            />
          </div>

          {/* Campo secundario (cambia según tipo) */}
          <React.Fragment key={operacion.tipo_operacion}>
            {renderCampoSecundario()}
          </React.Fragment>

          {/* Referencia / Comentario */}
          <div className="os-field-group">
            <label className="os-label">
              <i className="os-label-icon">📋</i> Referencia / Comentario
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
        />
      </div>

      {/* ── Tabla de detalles ── */}
      <div className="os-card os-card-table">
        <TablaDetalles
          detalles={operacion.detalles || []}
          onEliminarDetalle={eliminarDetalle}
        />

        {/* Totales */}
        <div className="os-totales">
          <div className="os-total-item">
            <span className="os-total-label">TOTAL UNIDADES</span>
            <span className="os-total-value">{total_unidades}</span>
          </div>
          <div className="os-total-item">
            <span className="os-total-label">COSTO TOTAL</span>
            <span className="os-total-value os-total-value-money">S/ {costo_total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductoSelector
// ─────────────────────────────────────────────────────────────────────────────
const ProductoSelector: React.FC<{
  onProductoSeleccionado: (detalle: DetalleOperacion) => void;
  operacion: Partial<OperacionStock>;
}> = ({ onProductoSeleccionado, operacion }) => {
  const [termino, setTermino] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState(1);
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    const detalle: DetalleOperacion = {
      producto_id: productoSeleccionado.id,
      cantidad,
      costo_unitario: productoSeleccionado.precio_compra,
      subtotal: cantidad * productoSeleccionado.precio_compra,
      producto: productoSeleccionado
    };
    onProductoSeleccionado(detalle);
    setProductoSeleccionado(null);
    setTermino('');
    setCantidad(1);
    setStockDisponible(null);
  };

  return (
    <div className="os-product-row">
      {/* Búsqueda */}
      <div className="os-product-search" ref={wrapperRef}>
        <label className="os-label">Producto</label>
        <div className="os-product-input-wrap">
          <input
            type="text"
            className="os-input os-input-product"
            placeholder="Buscar por nombre o código..."
            value={termino}
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
          className="os-input os-input-sm"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
          disabled={!productoSeleccionado}
        />
      </div>

      {/* Agregar */}
      <div className="os-product-field os-product-field-btn">
        <label className="os-label">&nbsp;</label>
        <button
          className="os-btn os-btn-primary os-btn-agregar"
          onClick={agregarProducto}
          disabled={!productoSeleccionado || cantidad <= 0}
        >
          + Agregar
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
}> = ({ detalles, onEliminarDetalle }) => {
  return (
    <div className="os-table-wrap">
      <table className="os-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Costo Unit.</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {detalles.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="os-table-empty">
                  <span className="os-table-empty-icon">⬡</span>
                  <span className="os-table-empty-text">Lista vacía. Selecciona un producto arriba.</span>
                </div>
              </td>
            </tr>
          ) : (
            detalles.map((d, i) => (
              <tr key={d.producto_id || i}>
                <td>{d.producto?.codigo || ''}</td>
                <td>{d.producto?.nombre || ''}</td>
                <td>S/ {d.costo_unitario.toFixed(2)}</td>
                <td>{d.cantidad}</td>
                <td>S/ {d.subtotal.toFixed(2)}</td>
                <td>
                  <button
                    className="os-btn-delete"
                    onClick={() => onEliminarDetalle(d.producto_id)}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OperacionesStock;