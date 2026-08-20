import React, { useEffect, useMemo, useState } from 'react';
import operacionStockService, { CarteraCliente } from '../services/operacionStock.service';
import '../styles/moduleBase.css';
import './CarteraCobros.css';

interface Props {
  onSelect: (c: CarteraCliente) => void;
}

const AGING_KEYS = ['actual', '1-30', '31-60', '61-90', '90+'] as const;
const AGING_LABELS: Record<string, string> = {
  actual: 'Actual',
  '1-30': '1-30',
  '31-60': '31-60',
  '61-90': '61-90',
  '90+': '90+',
};
const AGING_CLASSES: Record<string, string> = {
  actual: 'cc-actual',
  '1-30': 'cc-1-30',
  '31-60': 'cc-31-60',
  '61-90': 'cc-61-90',
  '90+': 'cc-90',
};

const CarteraCobros: React.FC<Props> = ({ onSelect }) => {
  const [clientes, setClientes] = useState<CarteraCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let activo = true;
    operacionStockService
      .getCartera()
      .then((data) => {
        if (activo) setClientes(data);
      })
      .catch((error) => console.error('Error al cargar cartera:', error))
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => `${c.nombre} ${c.documento}`.toLowerCase().includes(q));
  }, [busqueda, clientes]);

  const formatCurrency = (value: number) =>
    `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="cc-container">
      <div className="cc-header">
        <h2 className="cc-title">Cuentas por Cobrar</h2>
        <p className="cc-subtitle">Cartera de clientes con saldo pendiente</p>
      </div>

      <div className="cc-toolbar">
        <div className="module-search">
          <i className="bx bx-search" />
          <input
            type="text"
            placeholder="Buscar por cliente o documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="module-card">
        {loading ? (
          <div className="module-empty">
            <p>Cargando cartera...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="module-empty">
            <i className="bx bx-dollar-circle" style={{ fontSize: '32px', color: 'var(--color-sky-200)', marginBottom: '8px' }}></i>
            <p>No hay clientes con cuentas pendientes</p>
          </div>
        ) : (
          <table className="module-table cc-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Cliente</th>
                <th style={{ textAlign: 'left' }}>Documento</th>
                <th>Cuotas</th>
                <th>Saldo capital</th>
                <th>Total por cobrar</th>
                <th>Aging</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.cliente_id ?? `${c.nombre}-${c.documento}`}
                  className={c.cliente_id != null ? 'cc-row-clickable' : ''}
                  onClick={() => {
                    if (c.cliente_id != null) onSelect(c);
                  }}
                >
                  <td style={{ textAlign: 'left' }}>
                    <div className="cc-client-cell">
                      <span className="cc-avatar">
                        <i className="bx bx-user" />
                      </span>
                      {c.nombre}
                    </div>
                  </td>
                  <td className="cc-doc" style={{ textAlign: 'left' }}>{c.documento || '-'}</td>
                  <td>{c.cuotas_pendientes}</td>
                  <td>{formatCurrency(c.saldo_capital)}</td>
                  <td><strong>{formatCurrency(c.total)}</strong></td>
                  <td>
                    <div className="cc-aging">
                      {AGING_KEYS.map((k) => (
                        <span
                          key={k}
                          className={`cc-aging-chip ${AGING_CLASSES[k]}`}
                          title={`${AGING_LABELS[k]}: ${formatCurrency(c.aging[k])}`}
                        >
                          {AGING_LABELS[k]}: {formatCurrency(c.aging[k])}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="cc-btn-ver"
                      disabled={c.cliente_id == null}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (c.cliente_id != null) onSelect(c);
                      }}
                      title={c.cliente_id == null ? 'Cliente sin vinculación' : 'Ver cuentas por cobrar'}
                    >
                      <i className="bx bx-search" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CarteraCobros;