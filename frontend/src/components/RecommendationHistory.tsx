import React from 'react';
import { RecommendationMetrics } from '../services/alert.service';

const RecommendationHistory: React.FC<{ metricas: RecommendationMetrics | null; loading: boolean }> = ({ metricas, loading }) => {
  if (loading) {
    return (
      <div className="history-section skeleton">
        <div className="skeleton-history-title"></div>
        <div className="history-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="history-item skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!metricas) {
    return null;
  }

  const items = [
    { label: 'Generadas', value: metricas.total, className: '' },
    { label: 'Aceptadas', value: metricas.aceptadas, className: 'accepted' },
    { label: 'Rechazadas', value: metricas.rechazadas, className: 'rejected' }
  ];

  const precisionClass = metricas.precision >= 60 ? 'good' : metricas.precision >= 30 ? 'warn' : 'bad';

  return (
    <div className="history-section">
      <div className="history-grid">
        {items.map((item) => (
          <div key={item.label} className={`history-item ${item.className}`}>
            <span className="history-label">{item.label}</span>
            <span className="history-value">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="history-insights">
        <div className="insight">
          <span className="insight-label">Tasa de Aceptación</span>
          <div className="insight-bar accepted"><div style={{ width: `${metricas.tasaAceptacion}%` }}></div></div>
          <span className="insight-value">{metricas.tasaAceptacion}%</span>
        </div>
        <div className="insight">
          <span className="insight-label">Tasa de Rechazo</span>
          <div className="insight-bar rejected"><div style={{ width: `${metricas.tasaRechazo}%` }}></div></div>
          <span className="insight-value">{metricas.tasaRechazo}%</span>
        </div>
        <div className={`precision ${precisionClass}`}>
          <i className='bx bxs-target-lock'></i>
          <div>
            <span className="insight-label">Precisión del Motor</span>
            <span className="insight-value">{metricas.precision}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationHistory;