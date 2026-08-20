import React from 'react';
import { Recommendation } from '../types';

interface RecommendationHistoryListProps {
  items: Recommendation[];
  total: number;
  pagina: number;
  totalPaginas: number;
  loading: boolean;
  esGerente: boolean;
  onReopen: (id: number) => void;
  onPageChange: (pagina: number) => void;
}

const tipoLabels: Record<string, string> = {
  REORDEN: 'Reabastecimiento',
  PROMOCION: 'Promoción',
  INVESTIGAR: 'Investigar',
  DESCARTAR: 'Descartar',
  AJUSTE: 'Ajuste'
};

const estadoLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  EJECUTADA: 'Ejecutada'
};

const RecommendationHistoryList: React.FC<RecommendationHistoryListProps> = ({
  items,
  total,
  pagina,
  totalPaginas,
  loading,
  esGerente,
  onReopen,
  onPageChange
}) => {
  if (loading) {
    return (
      <div className="history-list-section skeleton">
        <div className="skeleton-history-list-title"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="history-list-row skeleton"></div>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="history-list-section">
        <h3 className="history-list-title">Historial de decisiones</h3>
        <div className="empty-state small">
          <i className='bx bx-history'></i>
          <p>Aún no hay decisiones registradas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list-section">
      <div className="history-list-header">
        <h3 className="history-list-title">
          <i className='bx bx-history'></i>
          Historial de decisiones
          <span className="history-list-count">{total}</span>
        </h3>
      </div>

      <div className="history-list-table">
        <table className="table history-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Decidida por</th>
              <th>Fecha</th>
              {esGerente && <th style={{ width: 90 }}>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((rec) => (
              <tr key={rec.id}>
                <td>{rec.product?.nombre || '—'}</td>
                <td>{tipoLabels[rec.tipo] || rec.tipo}</td>
                <td>
                  <span className={`priority-badge priority-${rec.prioridad.toLowerCase()}`}>
                    {rec.prioridad}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${rec.estado.toLowerCase()}`}>
                    {estadoLabels[rec.estado] || rec.estado}
                  </span>
                </td>
                <td>{rec.user?.nombre || '—'}</td>
                <td>{new Date(rec.createdAt).toLocaleDateString('es-PE')}</td>
                {esGerente && (
                  <td>
                    {rec.estado !== 'PENDIENTE' && (
                      <button
                        className="reopen-btn"
                        title="Reabrir decisión"
                        onClick={() => onReopen(rec.id)}
                      >
                        <i className='bx bx-rotate-left'></i> Reabrir
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="pagination history-pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagina - 1)}
            disabled={pagina === 1}
          >
            <i className='bx bx-chevron-left'></i>
            Anterior
          </button>
          <span className="pagination-info">
            Página {pagina} de {totalPaginas} ({total} registros)
          </span>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagina + 1)}
            disabled={pagina === totalPaginas}
          >
            Siguiente
            <i className='bx bx-chevron-right'></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendationHistoryList;