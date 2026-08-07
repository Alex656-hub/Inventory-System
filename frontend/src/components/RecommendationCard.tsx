import React from 'react';
import { Recommendation } from '../types';

interface CardProps {
  recommendation: Recommendation;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onExecute: (id: number) => void;
}

const RecommendationCard: React.FC<CardProps> = ({ recommendation, onAccept, onReject, onExecute }) => {
  const {
    prioridad,
    tipo,
    titulo,
    descripcion,
    cantidad_sugerida,
    costo_estimado,
    impacto_estimado,
    product,
    supplier
  } = recommendation;

  const priorityClass = `priority-${prioridad.toLowerCase()}`;
  
  return (
    <div className={`recommendation-card ${priorityClass}`}>
      <div className="card-header">
        <span className={`priority-badge ${priorityClass}`}>{prioridad}</span>
        <span className="type-badge">{tipo}</span>
      </div>
      
      <div className="card-body">
        <h3 className="card-title">{titulo}</h3>
        <p className="card-description">{descripcion}</p>
        
        <div className="card-details">
          <div className="detail-item">
            <span className="detail-label">Producto:</span>
            <span className="detail-value">{product?.nombre || 'N/A'}</span>
          </div>
          {cantidad_sugerida !== null && (
            <div className="detail-item">
              <span className="detail-label">Cant. Sugerida:</span>
              <span className="detail-value highlight">{cantidad_sugerida} unidades</span>
            </div>
          )}
          {costo_estimado !== null && (
            <div className="detail-item">
              <span className="detail-label">Costo Est.:</span>
              <span className="detail-value">S/ {costo_estimado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {impacto_estimado !== null && (
            <div className="detail-item">
              <span className="detail-label">Impacto:</span>
              <span className="detail-value warning">S/ {impacto_estimado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {supplier && (
            <div className="detail-item">
              <span className="detail-label">Proveedor:</span>
              <span className="detail-value">{supplier.nombre}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="card-actions">
        <button className="btn btn-sm btn-danger" onClick={() => onReject(recommendation.id)}>
          <i className='bx bx-x'></i> Rechazar
        </button>
        <button className="btn btn-sm btn-success" onClick={() => onAccept(recommendation.id)}>
          <i className='bx bx-check'></i> Aceptar
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => onExecute(recommendation.id)}>
          <i className='bx bx-rocket'></i> Ejecutar
        </button>
      </div>
    </div>
  );
};

export default RecommendationCard;
