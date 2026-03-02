// frontend/src/components/ReportSelector.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { authService } from '../services/auth.service';

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

  if (!usuario || usuario.rol !== 'gerente') {
    return <p>No tienes permisos para generar reportes.</p>;
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/reports/generate', params, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
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
    <div style={{ padding: '20px' }}>
      <h2>Generar Reporte</h2>
      <div style={{ marginBottom: '10px' }}>
        <label>Tipo de Reporte:</label>
        <select
          value={params.type}
          onChange={(e) => setParams({ ...params, type: e.target.value })}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="inventory_status">Estado de Inventario</option>
          <option value="stock_movements">Movimientos de Stock</option>
          <option value="financial_kpis">KPIs Financieros</option>
          <option value="demand_forecast">Predicciones de Demanda</option>
        </select>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Fecha Inicio:</label>
        <input
          type="date"
          value={params.startDate}
          onChange={(e) => setParams({ ...params, startDate: e.target.value })}
          style={{ marginLeft: '10px', padding: '5px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Fecha Fin:</label>
        <input
          type="date"
          value={params.endDate}
          onChange={(e) => setParams({ ...params, endDate: e.target.value })}
          style={{ marginLeft: '10px', padding: '5px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Formato:</label>
        <select
          value={params.format}
          onChange={(e) => setParams({ ...params, format: e.target.value as 'pdf' | 'excel' })}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
        </select>
      </div>
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: isLoading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Generando...' : 'Generar y Descargar'}
      </button>
    </div>
  );
};

export default ReportSelector;
