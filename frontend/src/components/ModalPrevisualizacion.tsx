import React from 'react';
import './ModalPrevisualizacion.css';
import { Movimiento } from '../services/movimiento.service';

interface ModalPrevisualizacionProps {
  html: string;
  onClose: () => void;
  movimiento: Movimiento | null;
}

const ModalPrevisualizacion: React.FC<ModalPrevisualizacionProps> = ({ html, onClose, movimiento }) => {
  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="modal-preview-overlay" onClick={onClose}>
      <div className="modal-preview-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-preview-header">
          <h3>Previsualización de Operación</h3>
          <button className="modal-preview-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-preview-body">
          <div className="preview-frame" dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <div className="modal-preview-footer">
          <button className="mp-btn mp-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="mp-btn mp-btn-primary" onClick={handleImprimir}>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPrevisualizacion;