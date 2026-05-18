// frontend/src/components/ReportSelector.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { authService } from '../services/auth.service';
import ModalKardexPDF from './ModalKardexPDF';
import ModalInventarioExcel from './ModalInventarioExcel';
import tokenManager from '../services/tokenManager.service';
import './ReportSelector.css';

interface ReportParams {
  type: string;
  startDate: string;
  endDate: string;
  filters: { categoryId?: number; supplierId?: number };
  format: 'pdf' | 'excel';
}

const ReportSelector: React.FC = () => {
  const { usuario } = authService.obtenerSesion();

  const [params, setParams] = useState<ReportParams>({
    type: 'inventory_status',
    startDate: '',
    endDate: '',
    filters: {},
    format: 'pdf'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [showInventarioModal, setShowInventarioModal] = useState(false);

  if (!usuario || usuario.rol !== 'gerente') {
    return <p>No tienes permisos para generar reportes.</p>;
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const headers = tokenManager.getAuthHeaders();
      const response = await axios.post('/api/reports/generate', params, {
        responseType: 'blob',
        headers: { ...headers }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${params.type}.${params.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar reporte');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="report-selector-container">
      <h2>Generar Reporte</h2>
      
      <div className="report-section">
        <h3>Reportes del Sistema</h3>
        <div className="report-form">
          <div className="report-field">
            <label>Tipo de Reporte:</label>
            <select
              value={params.type}
              onChange={(e) => setParams({ ...params, type: e.target.value })}
            >
              <option value="inventory_status">Estado de Inventario</option>
              <option value="stock_movements">Movimientos de Stock</option>
              <option value="financial_kpis">KPIs Financieros</option>
              <option value="demand_forecast">Predicciones de Demanda</option>
            </select>
          </div>
          <div className="report-field">
            <label>Fecha Inicio:</label>
            <input
              type="date"
              value={params.startDate}
              onChange={(e) => setParams({ ...params, startDate: e.target.value })}
            />
          </div>
          <div className="report-field">
            <label>Fecha Fin:</label>
            <input
              type="date"
              value={params.endDate}
              onChange={(e) => setParams({ ...params, endDate: e.target.value })}
            />
          </div>
          <div className="report-field">
            <label>Formato:</label>
            <select
              value={params.format}
              onChange={(e) => setParams({ ...params, format: e.target.value as 'pdf' | 'excel' })}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <button
            className="report-btn report-btn-primary"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? 'Generando...' : 'Generar y Descargar'}
          </button>
        </div>
      </div>

      <div className="report-section">
        <h3>Kardex</h3>
        <div className="report-buttons">
          <button 
            className="report-btn report-btn-secondary"
            onClick={() => setShowKardexModal(true)}
          >
            Kardex PDF
          </button>
        </div>
      </div>

      <div className="report-section">
        <h3>Inventario</h3>
        <div className="report-buttons">
          <button 
            className="report-btn report-btn-success"
            onClick={() => setShowInventarioModal(true)}
          >
            Exportar Excel 📊
          </button>
        </div>
      </div>

      {showKardexModal && (
        <ModalKardexPDF onClose={() => setShowKardexModal(false)} />
      )}
      {showInventarioModal && (
        <ModalInventarioExcel onClose={() => setShowInventarioModal(false)} />
      )}
    </div>
  );
};

export default ReportSelector;