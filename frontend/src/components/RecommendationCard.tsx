import React, { useState } from 'react';
import { Recommendation, RecommendationActionData } from '../types';

interface CardProps {
  recommendation: Recommendation;
  onAccept: (id: number, data?: RecommendationActionData) => void;
  onReject: (id: number) => void;
}

const tipoLabels: Record<string, string> = {
  REORDEN: 'Reordenar',
  PROMOCION: 'Promoción / Liquidación',
  INVESTIGAR: 'Investigar',
  AJUSTE: 'Ajuste de stock',
  DESCARTAR: 'No reponer'
};

const RecommendationCard: React.FC<CardProps> = ({ recommendation, onAccept, onReject }) => {
  const {
    prioridad,
    tipo,
    titulo,
    descripcion,
    cantidad_sugerida,
    costo_estimado,
    impacto_estimado,
    estado,
    product,
    supplier
  } = recommendation;

  const [descuento, setDescuento] = useState(() => {
    const max = Number(product?.descuento_promocion) || 0;
    return max > 0 ? max : 10;
  });
  const [promocionHasta, setPromocionHasta] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().slice(0, 10);
  });

  const priorityClass = `priority-${prioridad.toLowerCase()}`;
  const esPromoForm = tipo === 'PROMOCION' && estado === 'PENDIENTE';

  const handleConfirmar = () => {
    onAccept(
      recommendation.id,
      { descuento: Number(descuento) || 0, promocion_hasta: promocionHasta || null }
    );
  };

  return (
    <div className={`recommendation-card ${priorityClass}`}>
      <div className="card-header">
        <span className={`priority-badge ${priorityClass}`}>{prioridad}</span>
        <span className="type-badge">{tipoLabels[tipo] || tipo}</span>
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
              <span className="detail-value">S/ {Number(costo_estimado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {impacto_estimado !== null && (
            <div className="detail-item">
              <span className="detail-label">Impacto:</span>
              <span className="detail-value warning">S/ {Number(impacto_estimado).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
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

      {estado === 'PENDIENTE' ? (
        <>
          {esPromoForm && (
            <div className="promo-accept-form">
              <div className="promo-field">
                <label className="promo-label">% Descuento</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                />
              </div>
              <div className="promo-field">
                <label className="promo-label">Vigencia hasta</label>
                <input
                  type="date"
                  value={promocionHasta}
                  onChange={(e) => setPromocionHasta(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="card-actions">
            {esPromoForm ? (
              <>
                <button className="btn btn-sm btn-danger" onClick={() => onReject(recommendation.id)}>
                  <i className='bx bx-x'></i> Rechazar
                </button>
                <button className="btn btn-sm btn-success" onClick={handleConfirmar}>
                  <i className='bx bx-check'></i> Confirmar Promo
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-danger" onClick={() => onReject(recommendation.id)}>
                  <i className='bx bx-x'></i> Rechazar
                </button>
                <button className="btn btn-sm btn-success" onClick={() => onAccept(recommendation.id)}>
                  <i className='bx bx-check'></i> Aceptar
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="card-status">
          <span className={`status-badge status-${estado.toLowerCase()}`}>{estado}</span>
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;