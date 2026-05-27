import React, { useEffect, useState } from 'react';
import { alertService, InventoryMetrics } from '../services/alert.service';
import { Alert } from '../types';
import { useAuth } from '../hooks/useAuth';
import './AlertList.css';

type TabType = 'alerts' | 'analytics' | 'recommendations';

const AlertList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'high' | 'medium' | 'low' | ''>('');
  const [resolvedFilter, setResolvedFilter] = useState<boolean | ''>('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [recommendations, setRecommendations] = useState<string[]>([]);
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

  const cargarMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await alertService.getAnalytics();
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

  const handleResolveAlert = async (alertId: number) => {
    if (!esGerente) return;

    try {
      await alertService.resolveAlert(alertId);
      cargarAlerts();
    } catch (error) {
      console.error('Error al resolver alerta:', error);
    }
  };

  const handleCheckAlerts = async () => {
    if (!esGerente) return;

    try {
      await alertService.checkAlerts();
      cargarAlerts();
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

  const getMetricColor = (value: number, type: 'low' | 'high' | 'neutral' | 'percentage') => {
    if (type === 'low') return value <= 0 ? 'metric-danger' : value <= 5 ? 'metric-warning' : 'metric-success';
    if (type === 'high') return value >= 10 ? 'metric-danger' : value >= 5 ? 'metric-warning' : 'metric-success';
    if (type === 'percentage') return value >= 80 ? 'metric-success' : value >= 50 ? 'metric-warning' : 'metric-danger';
    return 'metric-neutral';
  };

  const renderMetricsGrid = () => {
    if (loadingMetrics) {
      return <div className="loading">Cargando métricas...</div>;
    }

    if (!metrics) {
      return <div className="error">No se pudieron cargar las métricas</div>;
    }

    const metricItems = [
      { label: 'Stock Bajo', value: metrics.stockBajo, type: 'low' as const, icon: '⚠️' },
      { label: 'Agotados', value: metrics.agotados, type: 'low' as const, icon: '❌' },
      { label: 'Total Productos', value: metrics.totalProductos, type: 'neutral' as const, icon: '📦' },
      { label: 'Rotación', value: metrics.rotacion, type: 'high' as const, icon: '🔄', suffix: 'x' },
      { label: 'Días Inventario', value: metrics.diasInventario, type: 'neutral' as const, icon: '📅', suffix: ' días' },
      { label: 'Capital Inmovilizado', value: metrics.capitalInmovilizado, type: 'neutral' as const, icon: '💰', prefix: 'S/ ', isCurrency: true },
      { label: 'Productos Lentos', value: metrics.productosLentos, type: 'low' as const, icon: '🐢' },
      { label: 'Sin Movimiento', value: metrics.sinMovimiento, type: 'low' as const, icon: '⏸️' },
      { label: 'Stock Muerto', value: metrics.stockMuerto, type: 'low' as const, icon: '💀' },
      { label: 'Margen Bruto', value: metrics.margenBruto, type: 'high' as const, icon: '📈', suffix: '%' },
      { label: 'ROI Inventario', value: metrics.roiInventario, type: 'high' as const, icon: '💹', suffix: '%' },
      { label: 'Precisión Inventario', value: metrics.precisionInventario, type: 'percentage' as const, icon: '🎯', suffix: '%' },
      { label: 'Ciclo Conversión', value: metrics.cicloConversion, type: 'neutral' as const, icon: '⏱️', suffix: ' días' },
      { label: 'Antigüedad Promedio', value: metrics.antiguedadPromedio, type: 'low' as const, icon: '📆', suffix: ' días' },
      { label: 'Tasa Agotamiento', value: metrics.tasaAgotamiento, type: 'low' as const, icon: '📉', suffix: '%' },
      { label: 'Valor Stock Muerto', value: metrics.valorStockMuerto, type: 'low' as const, icon: '🪙', prefix: 'S/ ', isCurrency: true },
    ];

    return (
      <div className="metrics-grid">
        {metricItems.map((metric, index) => (
          <div key={index} className={`metric-card ${getMetricColor(metric.value, metric.type)}`}>
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-value">
              {metric.prefix || ''}{typeof metric.value === 'number' ? (metric.isCurrency ? metric.value.toLocaleString('es-PE') : metric.value) : metric.value}{metric.suffix || ''}
            </div>
            <div className="metric-label">{metric.label}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderRecommendations = () => {
    if (loadingRecommendations) {
      return <div className="loading">Cargando recomendaciones...</div>;
    }

    if (recommendations.length === 0) {
      return (
        <div className="empty-state">
          <p>No hay recomendaciones en este momento.</p>
          <p className="empty-hint">Las recomendaciones se generan automáticamente basándose en las alertas activas.</p>
        </div>
      );
    }

    return (
      <div className="recommendations-list">
        {recommendations.map((rec, index) => (
          <div key={index} className="recommendation-item">
            <div className="recommendation-number">{index + 1}</div>
            <div className="recommendation-text">{rec}</div>
          </div>
        ))}
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
                  <label>Tipo:</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="low_stock">Stock Bajo</option>
                    <option value="overstock">Sobrestock</option>
                    <option value="demand_trend">Tendencia de Demanda</option>
                  </select>
                </div>

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

              {loading ? (
                <div className="loading">Cargando alertas...</div>
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
                </>
              )}
            </>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <div className="section-header">
                <h2>Métricas del Inventario</h2>
                <button className="btn btn-secondary" onClick={cargarMetrics}>
                  <i className='bx bx-refresh'></i> Actualizar
                </button>
              </div>
              {renderMetricsGrid()}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="recommendations-section">
              <div className="section-header">
                <h2>Acciones Sugeridas</h2>
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