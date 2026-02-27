import React, { useEffect, useState } from 'react';
import { alertService } from '../services/alert.service';
import { Alert } from '../types';
import { useAuth } from '../hooks/useAuth';
import './AlertList.css';

const AlertList: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'high' | 'medium' | 'low' | ''>('');
  const [resolvedFilter, setResolvedFilter] = useState<boolean | ''>('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  const cargarAlerts = async () => {
    setLoading(true);
    try {
      const params: any = {
        pagina,
        limite: 10
      };

      if (severityFilter) {
        params.severity = severityFilter;
      }

      if (resolvedFilter !== '') {
        params.resolved = resolvedFilter;
      }

      const response = await alertService.getAlerts(params);
      setAlerts(response.alertas);
      setTotalPaginas(response.paginacion.totalPaginas);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlerts();
  }, [pagina, severityFilter, resolvedFilter]);

  const handleResolveAlert = async (alertId: number) => {
    if (!esGerente) return;

    try {
      await alertService.resolveAlert(alertId);
      cargarAlerts(); // Recargar la lista
    } catch (error) {
      console.error('Error al resolver alerta:', error);
    }
  };

  const handleCheckAlerts = async () => {
    if (!esGerente) return;

    try {
      await alertService.checkAlerts();
      cargarAlerts(); // Recargar la lista
    } catch (error) {
      console.error('Error al verificar alertas:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const classes = {
      high: 'badge badge-danger',
      medium: 'badge badge-warning',
      low: 'badge badge-info'
    };
    return classes[severity as keyof typeof classes] || 'badge badge-secondary';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      low_stock: 'Stock Bajo',
      overstock: 'Sobrestock',
      demand_trend: 'Tendencia de Demanda'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return <div className="loading">Cargando alertas...</div>;
  }

  return (
    <div className="alert-list-container">
      <div className="header">
        <h2>Alertas del Sistema</h2>
        {esGerente && (
          <button className="btn btn-primary" onClick={handleCheckAlerts}>
            Verificar Alertas
          </button>
        )}
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Severidad:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
          >
            <option value="">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Estado:</label>
          <select
            value={resolvedFilter.toString()}
            onChange={(e) => setResolvedFilter(e.target.value === '' ? '' : e.target.value === 'true')}
          >
            <option value="">Todas</option>
            <option value="false">Activas</option>
            <option value="true">Resueltas</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Mensaje</th>
              <th>Severidad</th>
              <th>Producto</th>
              <th>Fecha</th>
              <th>Estado</th>
              {esGerente && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{getTypeLabel(alert.type)}</td>
                <td>{alert.message}</td>
                <td>
                  <span className={getSeverityBadge(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </span>
                </td>
                <td>{alert.product?.nombre || 'N/A'}</td>
                <td>{new Date(alert.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={`status ${alert.resolved ? 'resolved' : 'active'}`}>
                    {alert.resolved ? 'Resuelta' : 'Activa'}
                  </span>
                </td>
                {esGerente && (
                  <td>
                    {!alert.resolved && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        Resolver
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
        <div className="pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setPagina(pagina - 1)}
            disabled={pagina === 1}
          >
            Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button
            className="btn btn-secondary"
            onClick={() => setPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertList;
