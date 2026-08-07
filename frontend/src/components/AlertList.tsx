import React, { useEffect, useState } from 'react';
import { alertService, InventoryMetrics } from '../services/alert.service';
import { Alert, Recommendation } from '../types';
import { useAuth } from '../hooks/useAuth';
import RecommendationSummary from './RecommendationSummary';
import RecommendationCard from './RecommendationCard';
import AnalyticsDashboard from './AnalyticsDashboard';
import './AlertList.css';

type TabType = 'alerts' | 'analytics' | 'recommendations';

const AlertList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'high' | 'medium' | 'low' | ''>('');
  const [resolvedFilter, setResolvedFilter] = useState<boolean | ''>(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    pendientes: number;
    urgentes: number;
    costoTotalEstimado: number;
  } | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  const cargarAlerts = async () => {
    setLoading(true);
    try {
      const params: any = {
        pagina,
        limite: 10
      };

      if (typeFilter) {
        params.type = typeFilter;
      }

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

  const cargarMetrics = async (params?: { fechaInicio?: string; fechaFin?: string }) => {
    setLoadingMetrics(true);
    try {
      const data = await alertService.getAnalytics(params);
      setMetrics(data);
    } catch (error) {
      console.error('Error al cargar métricas:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const cargarRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await alertService.getRecommendations();
      setRecommendations(response.recomendaciones);
      setSummary(response.resumen);
    } catch (error) {
      console.error('Error al cargar recomendaciones:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    cargarAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, typeFilter, severityFilter, resolvedFilter]);

  useEffect(() => {
    if (activeTab === 'analytics' && !metrics) {
      cargarMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'recommendations' && recommendations.length === 0) {
      cargarRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCheckAlerts = async () => {
    if (!esGerente) return;

    try {
      await alertService.checkAlerts();
      cargarAlerts();
    } catch (error) {
      console.error('Error al verificar alertas:', error);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    if (!esGerente) return;

    try {
      await alertService.resolveAlert(alertId);
      cargarAlerts();
    } catch (error) {
      console.error('Error al resolver alerta:', error);
    }
  };

  const handleRecommendationAction = async (id: number, action: 'accept' | 'reject' | 'execute') => {
    if (!esGerente) return;
    try {
      const result = await alertService.updateRecommendationStatus(id, action);
      alert(result.mensaje);
      cargarRecommendations();
    } catch (error) {
      console.error(`Error al procesar acción ${action}:`, error);
      alert('Error al procesar la acción');
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
      out_of_stock: 'Agotado',
      low_stock: 'Stock Bajo',
      overstock: 'Sobrestock',
      demand_trend: 'Tendencia de Demanda'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const renderSkeletonTable = () => (
    <div className="skeleton-table skeleton">
      <div className="skeleton-table-header">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton-table-header-cell"></div>
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-table-row">
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <div key={j} className={`skeleton-table-cell ${j === 2 ? 'short' : ''}`}></div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderRecommendations = () => {
    if (loadingRecommendations) {
      return (
        <div className="skeleton-recommendations">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-recommendation skeleton">
              <div className="skeleton-recommendation-number"></div>
              <div className="skeleton-recommendation-text"></div>
            </div>
          ))}
        </div>
      );
    }

    if (recommendations.length === 0) {
      return (
        <div className="empty-state">
          <i className='bx bx-check-circle'></i>
          <p>No hay recomendaciones en este momento</p>
          <p className="empty-hint">Las recomendaciones se generan automáticamente basándose en las alertas activas.</p>
        </div>
      );
    }

    return (
      <div className="recommendations-container">
        {summary && <RecommendationSummary resumen={summary} />}
        <div className="recommendations-list">
          {recommendations.map((rec) => (
            <RecommendationCard 
              key={rec.id} 
              recommendation={rec} 
              onAccept={(id) => handleRecommendationAction(id, 'accept')}
              onReject={(id) => handleRecommendationAction(id, 'reject')}
              onExecute={(id) => handleRecommendationAction(id, 'execute')}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="alert-list-container">
      <div className="module-page">
        <div className="module-page-header">
          <div>
            <h1 className="module-title">Alertas de Stock</h1>
            <p className="module-subtitle">Monitorea el estado de tu inventario</p>
          </div>
          {esGerente && activeTab === 'alerts' && (
            <button className="module-primary-btn" onClick={handleCheckAlerts}>
              <i className='bx bx-refresh'></i>
              Verificar Alertas
            </button>
          )}
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              <i className='bx bx-bell'></i>
              Alertas
            </button>
            <button
              className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className='bx bx-bar-chart-alt-2'></i>
              Análisis
            </button>
            <button
              className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              <i className='bx bx-lightbulb'></i>
              Recomendaciones
            </button>
          </div>
        </div>

        <div className="tab-content">
          {activeTab === 'alerts' && (
            <>
              <div className="filters">
                <div className="filter-group">
                  <label>Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="out_of_stock">Agotado</option>
                    <option value="low_stock">Stock Bajo</option>
                    <option value="overstock">Sobrestock</option>
                    <option value="demand_trend">Tendencia de Demanda</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Severidad</label>
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
                  <label>Estado</label>
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

              {loading ? (
                renderSkeletonTable()
              ) : (
                <>
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
                        <i className='bx bx-chevron-left'></i>
                        Anterior
                      </button>
                      <span>Página {pagina} de {totalPaginas}</span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPagina(pagina + 1)}
                        disabled={pagina === totalPaginas}
                      >
                        Siguiente
                        <i className='bx bx-chevron-right'></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <AnalyticsDashboard 
                metrics={metrics} 
                loading={loadingMetrics}
                onRefresh={cargarMetrics}
              />
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="recommendations-section">
              <div className="section-header">
                <h2>
                  <i className='bx bx-lightbulb'></i>
                  Acciones Sugeridas
                </h2>
                <button className="btn btn-secondary" onClick={cargarRecommendations}>
                  <i className='bx bx-refresh'></i> Actualizar
                </button>
              </div>
              {renderRecommendations()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertList;
