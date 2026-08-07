import React from 'react';

interface SummaryProps {
  resumen: {
    total: number;
    pendientes: number;
    urgentes: number;
    costoTotalEstimado: number;
  };
}

const RecommendationSummary: React.FC<SummaryProps> = ({ resumen }) => {
  return (
    <div className="recommendation-summary">
      <div className="summary-item">
        <span className="summary-label">Total</span>
        <span className="summary-value">{resumen.total}</span>
      </div>
      <div className="summary-item">
        <span className="summary-label">Pendientes</span>
        <span className="summary-value">{resumen.pendientes}</span>
      </div>
      <div className="summary-item urgent">
        <span className="summary-label">Urgentes</span>
        <span className="summary-value">{resumen.urgentes}</span>
      </div>
      <div className="summary-item financial">
        <span className="summary-label">Costo Est.</span>
        <span className="summary-value">S/ {resumen.costoTotalEstimado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
};

export default RecommendationSummary;
