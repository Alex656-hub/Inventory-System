import React, { useState, useEffect } from 'react';
import './HistorialKardex.css';
import { movimientoService, Movimiento } from '../services/movimiento.service';
import ModalPrevisualizacion from './ModalPrevisualizacion';
import ModalKardexPDF from './ModalKardexPDF';
import ModalDetalleMovimiento from './ModalDetalleMovimiento';
import api from '../config/api';

interface SedeOption {
  id: number;
  nombre: string;
}

const HistorialKardex: React.FC = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, totalPaginas: 1 });
  const [limite, setLimite] = useState(20);
  const [periodoActivo, setPeriodoActivo] = useState<'hoy' | 'semana' | 'mes' | 'anio' | ''>('');
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [showKardexModal, setShowKardexModal] = useState(false);

  const [filtros, setFiltros] = useState({
    producto_id: '' as string | number,
    tipo_movimiento: '',
    fecha_desde: '',
    fecha_hasta: '',
    sede_id: '' as number | string,
  });

  const [selectedMovimiento, setSelectedMovimiento] = useState<Movimiento | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Modal detalle movimiento
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [detalleMovimiento, setDetalleMovimiento] = useState<Movimiento | null>(null);

  const handleVerDetalle = (mov: Movimiento) => {
    setDetalleMovimiento(mov);
    setShowDetalleModal(true);
  };

  const handleCerrarDetalle = () => {
    setShowDetalleModal(false);
    setDetalleMovimiento(null);
  };

  useEffect(() => {
    cargarSedes();
    fetchMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginacion.pagina, limite]);

  const cargarSedes = async () => {
    try {
      const response = await api.get('/sedes');
      const data = response.data.sedes || response.data;
      setSedes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar sedes:', error);
    }
  };

  const fetchMovimientos = async (sobreescribeFiltros: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const params: any = {
        pagina: paginacion.pagina,
        limite,
      };
      
      const f = { ...filtros, ...sobreescribeFiltros };
      if (f.producto_id) params.producto_id = f.producto_id;
      if (f.tipo_movimiento) params.tipo_movimiento = f.tipo_movimiento;
      if (f.fecha_desde) params.fecha_desde = f.fecha_desde;
      if (f.fecha_hasta) params.fecha_hasta = f.fecha_hasta;
      if (f.sede_id) params.sede_id = f.sede_id;

      const response = await movimientoService.getHistorial(params);
      setMovimientos(response.movimientos);
      setPaginacion(response.paginacion);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodo = (periodo: 'hoy' | 'semana' | 'mes' | 'anio') => {
    setPeriodoActivo(periodo);
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    let desde = '';

    if (periodo === 'hoy') {
      desde = fmt(hoy);
    } else if (periodo === 'semana') {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - 7);
      desde = fmt(d);
    } else if (periodo === 'mes') {
      desde = fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    } else if (periodo === 'anio') {
      desde = fmt(new Date(hoy.getFullYear(), 0, 1));
    }

    const hasta = fmt(hoy);
    setFiltros(prev => ({ ...prev, fecha_desde: desde, fecha_hasta: hasta }));
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
    fetchMovimientos({ fecha_desde: desde, fecha_hasta: hasta });
  };

  const handleBuscar = () => {
    setPeriodoActivo('');
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
    fetchMovimientos();
  };

  const handleLimpiarFiltros = () => {
    setPeriodoActivo('');
    setFiltros({
      producto_id: '',
      tipo_movimiento: '',
      fecha_desde: '',
      fecha_hasta: '',
      sede_id: '',
    });
    setLimite(20);
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
    fetchMovimientos();
  };

  const handlePrevisualizar = async (movimiento: Movimiento) => {
    if (!movimiento.tiene_pdf || !movimiento.referencia_id) {
      alert('No hay PDF disponible para este movimiento');
      return;
    }
    setPreviewLoading(true);
    try {
      const response = await movimientoService.getMovimientoPreview(movimiento.referencia_id);
      setPreviewHtml(response.html);
      setSelectedMovimiento(movimiento);
      setShowPreview(true);
    } catch (error) {
      console.error('Error al obtener preview:', error);
      alert('Error al cargar la previsualización');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImprimirPdf = async (movimiento: Movimiento) => {
    if (!movimiento.tiene_pdf || !movimiento.referencia_id) {
      alert('No hay PDF disponible para este movimiento');
      return;
    }
    try {
      const blob = await movimientoService.getMovimientoPdf(movimiento.referencia_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `operacion_${movimiento.referencia_id}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      alert('Error al descargar el PDF');
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE');
  };

  const formatTipo = (tipo: string) => {
    const tipoMap: Record<string, string> = {
      'entrada': 'ENTRADA',
      'salida': 'SALIDA',
      'ajuste': 'AJUSTE',
    };
    return tipoMap[tipo] || tipo.toUpperCase();
  };

  return (
    <div className="historial-kardex-container">
      <div className="hk-header">
        <h1 className="module-title">Kardex - Historial de Movimientos</h1>
        <p className="module-subtitle">Consulta el historial completo de movimientos de inventario</p>
      </div>

      <div className="hk-encabezado-card">
        <div className="hk-periodo-bar">
          <div className="hk-periodo-btns">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Última Semana' },
              { key: 'mes', label: 'Este Mes' },
              { key: 'anio', label: 'Este Año' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`hk-periodo-btn ${periodoActivo === key ? 'hk-periodo-btn--active' : ''}`}
                onClick={() => handlePeriodo(key as any)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="hk-rango-fechas">
            <span className="hk-rango-icono"><i className="bx bx-calendar"></i></span>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
              className="hk-rango-input"
            />
            <span className="hk-rango-separador">-</span>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
              className="hk-rango-input"
            />
          </div>
        </div>

        <div className="hk-filtros-secundarios">
          <div className="hk-filtro-group">
            <label>Reportes</label>
            <button className="hk-btn-reporte" onClick={() => setShowKardexModal(true)}>
              <i className="bx bx-file-blank"></i> Kardex PDF
            </button>
          </div>

          <div className="hk-filtro-group">
            <label>Tipo</label>
            <select
              value={filtros.tipo_movimiento}
              onChange={(e) => setFiltros({ ...filtros, tipo_movimiento: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>

          <div className="hk-filtro-group">
            <label>Filas</label>
            <select value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
              <option value={10}>10 filas</option>
              <option value={20}>20 filas</option>
              <option value={50}>50 filas</option>
              <option value={100}>100 filas</option>
            </select>
          </div>

          <div className="hk-filtro-group hk-filtro-group--wide">
            <label>Sede</label>
            <select
              value={filtros.sede_id}
              onChange={(e) => setFiltros({ ...filtros, sede_id: e.target.value })}
            >
              <option value="">Todas las Sedes</option>
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="hk-filtro-group hk-filtro-group--wide">
            <label>Filtro Rápido</label>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={filtros.producto_id}
              onChange={(e) => setFiltros({ ...filtros, producto_id: e.target.value })}
            />
          </div>

          <div className="hk-filtro-actions">
            <button className="hk-btn hk-btn-primary" onClick={handleBuscar}>Buscar</button>
            <button className="hk-btn hk-btn-secondary" onClick={handleLimpiarFiltros}>Limpiar</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="hk-skeleton-table">
          <div className="hk-skeleton-table-header">
            <div className="hk-skeleton-table-header-cell"></div>
            <div className="hk-skeleton-table-header-cell"></div>
            <div className="hk-skeleton-table-header-cell"></div>
            <div className="hk-skeleton-table-header-cell"></div>
            <div className="hk-skeleton-table-header-cell"></div>
            <div className="hk-skeleton-table-header-cell"></div>
            <div className="hk-skeleton-table-header-cell"></div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="hk-skeleton-table-row hk-skeleton" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="hk-skeleton-table-cell"></div>
              <div className="hk-skeleton-table-cell"></div>
              <div className="hk-skeleton-table-cell"></div>
              <div className="hk-skeleton-table-cell"></div>
              <div className="hk-skeleton-table-cell"></div>
              <div className="hk-skeleton-table-cell"></div>
              <div className="hk-skeleton-table-cell"></div>
            </div>
          ))}
        </div>
      ) : movimientos.length === 0 ? (
        <div className="hk-empty">
          <i className="bx bx-package"></i>
          <p>No se encontraron movimientos</p>
        </div>
      ) : (
      <div className="hk-tabla-container">
        <table className="hk-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Mov. ID</th>
              <th>Origen / Destino</th>
              <th>Responsable</th>
              <th>Cant.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {
              movimientos.map((mov, index) => (
                <tr key={mov.id} className={index % 2 === 0 ? 'hk-row-even' : 'hk-row-odd'}>
                  <td>{formatFecha(mov.fecha)}</td>
                  <td>
                    <span className={`hk-badge hk-badge-${mov.tipo_movimiento}`}>
                      {formatTipo(mov.tipo_movimiento)}
                    </span>
                  </td>
                  <td>#{mov.referencia_id || '-'}</td>
                  <td>
                    <div className="hk-origen-destino">
                      <span className="hk-origen">
                        {mov.sede_origen || mov.sede_destino || '-'}
                      </span>
                      {mov.sede_origen && mov.sede_destino && (
                        <span className="hk-destino">→ {mov.sede_destino}</span>
                      )}
                    </div>
                  </td>
                  <td>{mov.responsable || '-'}</td>
                  <td className="hk-numero">{mov.cantidad}</td>
                  <td>
                    <div className="hk-actions">
                      <button className="hk-btn-action hk-btn-detail"
                        onClick={() => handleVerDetalle(mov)}
                        title="Ver detalle"><i className="bx bx-detail"></i></button>
                      <button className="hk-btn-action hk-btn-preview"
                        onClick={() => handlePrevisualizar(mov)}
                        disabled={previewLoading || !mov.tiene_pdf}
                        title="Previsualizar"><i className="bx bx-show"></i></button>
                      <button className="hk-btn-action hk-btn-print"
                        onClick={() => handleImprimirPdf(mov)}
                        disabled={!mov.tiene_pdf}
                        title="Imprimir PDF"><i className="bx bx-printer"></i></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      )}

      {paginacion.totalPaginas > 1 && (
        <div className="hk-pagination">
          <button disabled={paginacion.pagina === 1}
            onClick={() => setPaginacion({ ...paginacion, pagina: paginacion.pagina - 1 })}>
            Anterior
          </button>
          <span>Página {paginacion.pagina} de {paginacion.totalPaginas} (Total: {paginacion.total})</span>
          <button disabled={paginacion.pagina === paginacion.totalPaginas}
            onClick={() => setPaginacion({ ...paginacion, pagina: paginacion.pagina + 1 })}>
            Siguiente
          </button>
        </div>
      )}

      {showPreview && (
        <ModalPrevisualizacion html={previewHtml} onClose={() => setShowPreview(false)} movimiento={selectedMovimiento} />
      )}
      {showKardexModal && (
        <ModalKardexPDF onClose={() => setShowKardexModal(false)} />
      )}
      {showDetalleModal && detalleMovimiento && (
        <ModalDetalleMovimiento movimiento={detalleMovimiento} onClose={handleCerrarDetalle} />
      )}
    </div>
  );
};

export default HistorialKardex;