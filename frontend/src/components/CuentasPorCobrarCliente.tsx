import React, { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import operacionStockService, { CuentaPorCobrar, AgingBucket, CuotasClienteResponse } from '../services/operacionStock.service';
import './CuentasPorCobrarCliente.css';

interface Props {
  clienteId: number;
  clienteNombre: string;
  onRefresh?: () => void;
}

const CuentasPorCobrarCliente: React.FC<Props> = ({ clienteId, clienteNombre, onRefresh }) => {
  const [cuotas, setCuotas] = useState<CuentaPorCobrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendiente' | 'pagada' | 'atrasada'>('todas');
  const [aging, setAging] = useState<AgingBucket>({ actual: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [showCobrarModal, setShowCobrarModal] = useState<{ cuota: CuentaPorCobrar } | null>(null);
  const [fechaPago, setFechaPago] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cobrando, setCobrando] = useState(false);

  const cargarCuotas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { pagina, limite: 20 };
      if (filtroEstado !== 'todas') params.estado = filtroEstado;
      
      const response: CuotasClienteResponse = await operacionStockService.getCuotasCliente(clienteId, params);
      setCuotas(response.cuotas);
      setTotalPaginas(response.paginacion.totalPaginas);
    } catch (error) {
      console.error('Error al cargar cuotas:', error);
    } finally {
      setLoading(false);
    }
  }, [clienteId, filtroEstado, pagina]);

  const cargarAging = useCallback(async () => {
    try {
      const data = await operacionStockService.getAgingCliente(clienteId);
      setAging(data);
    } catch (error) {
      console.error('Error al cargar aging:', error);
    }
  }, [clienteId]);

  useEffect(() => {
    cargarCuotas();
    cargarAging();
  }, [cargarCuotas, cargarAging]);

  const handleCobrar = (cuota: CuentaPorCobrar) => {
    setShowCobrarModal({ cuota });
    const hoy = new Date().toISOString().split('T')[0];
    setFechaPago(hoy);
    setObservaciones('');
  };

  const confirmarCobro = async () => {
    if (!showCobrarModal) return;
    setCobrando(true);
    try {
      await operacionStockService.pagarCuota(showCobrarModal.cuota.id, {
        fecha_pago: fechaPago,
        observaciones: observaciones || undefined,
      });
      setShowCobrarModal(null);
      cargarCuotas();
      cargarAging();
      onRefresh?.();
    } catch (error) {
      console.error('Error al cobrar cuota:', error);
      alert('Error al procesar el cobro');
    } finally {
      setCobrando(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const classes = {
      pendiente: 'badge badge-warning',
      pagada: 'badge badge-success',
      atrasada: 'badge badge-danger',
    };
    const labels = {
      pendiente: 'Pendiente',
      pagada: 'Pagada',
      atrasada: 'Atrasada',
    };
    return (
      <span className={classes[estado as keyof typeof classes] || 'badge badge-secondary'}>
        {labels[estado as keyof typeof labels] || estado}
      </span>
    );
  };

  const getDiasAtraso = (fechaVencimiento: string, estado: string): number | null => {
    if (estado !== 'atrasada') return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVencimiento);
    venc.setHours(0, 0, 0, 0);
    const diff = Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  };

  const formatCurrency = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading && cuotas.length === 0) {
    return (
      <div className="cpc-skeleton">
        <div className="cpc-skeleton-aging">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="cpc-skeleton-item" />)}
        </div>
        <div className="cpc-skeleton-table">
          <div className="cpc-skeleton-header">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="cpc-skeleton-cell" />)}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="cpc-skeleton-row">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(j => <div key={j} className="cpc-skeleton-cell" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cpc-container">
      <div className="cpc-header">
        <h2 className="cpc-title">Cuentas por Cobrar</h2>
        <p className="cpc-subtitle">Cliente: {clienteNombre}</p>
      </div>

      {/* Aging Bar */}
      <div className="cpc-aging-bar">
        <div className="cpc-aging-item actual">
          <span className="cpc-aging-label">Actual</span>
          <strong className="cpc-aging-value">{formatCurrency(aging.actual)}</strong>
        </div>
        <div className="cpc-aging-item v1-30">
          <span className="cpc-aging-label">1-30 días</span>
          <strong className="cpc-aging-value">{formatCurrency(aging['1-30'])}</strong>
        </div>
        <div className="cpc-aging-item v31-60">
          <span className="cpc-aging-label">31-60 días</span>
          <strong className="cpc-aging-value">{formatCurrency(aging['31-60'])}</strong>
        </div>
        <div className="cpc-aging-item v61-90">
          <span className="cpc-aging-label">61-90 días</span>
          <strong className="cpc-aging-value">{formatCurrency(aging['61-90'])}</strong>
        </div>
        <div className="cpc-aging-item v90">
          <span className="cpc-aging-label">90+ días</span>
          <strong className="cpc-aging-value">{formatCurrency(aging['90+'])}</strong>
        </div>
        <div className="cpc-aging-total">
          <span>Total por cobrar</span>
          <strong>{formatCurrency(Object.values(aging).reduce((a, b) => a + b, 0))}</strong>
        </div>
      </div>

      {/* Filtros */}
      <div className="cpc-filters">
        <div className="cpc-filter-group">
          <label>Estado</label>
          <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value as any); setPagina(1); }}>
            <option value="todas">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="atrasada">Atrasadas</option>
            <option value="pagada">Pagadas</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="cpc-table-container">
        <table className="cpc-table">
          <thead>
            <tr>
              <th>Venta</th>
              <th>Cuota</th>
              <th>Vencimiento</th>
              <th>Capital</th>
              <th>Interés</th>
              <th>Total</th>
              <th>Días atraso</th>
              <th>Estado</th>
              <th>Garantía</th>
              <th>Aval</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cuotas.length === 0 ? (
              <tr>
                <td colSpan={11} className="cpc-empty">
                  <i className="bx bx-credit-card" style={{ fontSize: '32px', color: 'var(--color-sky-200)', marginBottom: '8px', display: 'block' }}></i>
                  <p>No se encontraron cuotas</p>
                </td>
              </tr>
            ) : (
              cuotas.map(c => (
                <tr key={c.id} className={c.estado === 'atrasada' ? 'cpc-row-atrasada' : ''}>
                  <td>{c.salida?.numero_documento || '-'}</td>
                  <td>{c.numero_cuota} / {c.total_cuotas}</td>
                  <td>{new Date(c.fecha_vencimiento).toLocaleDateString('es-PE')}</td>
                  <td>{formatCurrency(c.monto_capital)}</td>
                  <td>{formatCurrency(c.monto_interes)}</td>
                  <td><strong>{formatCurrency(c.monto_total)}</strong></td>
                  <td>
                    {getDiasAtraso(c.fecha_vencimiento, c.estado) !== null && (
                      <span className="cpc-dias-atraso">{getDiasAtraso(c.fecha_vencimiento, c.estado)} días</span>
                    )}
                  </td>
                  <td>{getEstadoBadge(c.estado)}</td>
                  <td>
                    {c.garantia_tipo === 'ninguna' ? (
                      <span className="cpc-text-muted">—</span>
                    ) : (
                      <span>{c.garantia_tipo.toUpperCase()}: {c.garantia_valor}</span>
                    )}
                  </td>
                  <td>
                    {c.aval_nombre ? (
                      <div>
                        <div>{c.aval_nombre}</div>
                        <small className="cpc-text-muted">{c.aval_contacto}</small>
                      </div>
                    ) : (
                      <span className="cpc-text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {c.estado === 'pendiente' || c.estado === 'atrasada' ? (
                      <button
                        className="cpc-btn-cobrar"
                        onClick={() => handleCobrar(c)}
                        disabled={cobrando}
                      >
                        <i className="bx bx-check" /> Cobrar
                      </button>
                    ) : (
                      <span className="cpc-text-muted">Pagada</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="cpc-pagination">
            <button
              className="cpc-btn-page"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              <i className="bx bx-chevron-left" />
            </button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button
              className="cpc-btn-page"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Cobrar */}
      {showCobrarModal && (
        <Modal
          title={`Cobrar cuota ${showCobrarModal.cuota.numero_cuota} / ${showCobrarModal.cuota.total_cuotas}`}
          isOpen={true}
          onClose={() => setShowCobrarModal(null)}
          size="small"
        >
          <form onSubmit={(e) => { e.preventDefault(); confirmarCobro(); }}>
            <div className="cpc-modal-field">
              <label>Cuota a cobrar</label>
              <input
                type="text"
                className="cpc-modal-input"
                value={formatCurrency(showCobrarModal.cuota.monto_total)}
                readOnly
              />
            </div>
            <div className="cpc-modal-field">
              <label>Fecha de pago *</label>
              <input
                type="date"
                className="cpc-modal-input"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                required
              />
            </div>
            <div className="cpc-modal-field">
              <label>Observaciones</label>
              <textarea
                className="cpc-modal-input"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Referencia de pago, método, etc."
                rows={3}
              />
            </div>
            <div className="cpc-modal-actions">
              <button type="button" className="cpc-btn cpc-btn-ghost" onClick={() => setShowCobrarModal(null)} disabled={cobrando}>
                Cancelar
              </button>
              <button type="submit" className="cpc-btn cpc-btn-primary" disabled={cobrando}>
                {cobrando ? 'Procesando...' : 'Confirmar cobro'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CuentasPorCobrarCliente;