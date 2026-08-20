import React, { useEffect, useState } from 'react';
import { alertService, InventoryMetrics, RecommendationMetrics } from '../services/alert.service';
import { Alert, Recommendation, RecommendationActionData } from '../types';
import { useAuth } from '../hooks/useAuth';
import RecommendationCard from './RecommendationCard';
import RecommendationHistory from './RecommendationHistory';
import RecommendationHistoryList from './RecommendationHistoryList';
import AnalyticsDashboard from './AnalyticsDashboard';
import '../styles/tabs.css';
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
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [historyMetrics, setHistoryMetrics] = useState<RecommendationMetrics | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [historyItems, setHistoryItems] = useState<Recommendation[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPagina, setHistoryPagina] = useState(1);
  const [historyTotalPaginas, setHistoryTotalPaginas] = useState(1);
  const [loadingHistoryList, setLoadingHistoryList] = useState(false);

  const [recFilter, setRecFilter] = useState<'pendientes' | 'aceptadas' | 'rechazadas' | 'todas'>('pendientes');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const prioridades = [
    ['', 'Todas'],
    ['URGENTE', 'Urgente'],
    ['ALTA', 'Alta'],
    ['MEDIA', 'Media'],
    ['BAJA', 'Baja']
  ];

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
      const response = await alertService.getRecommendations(recFilter);
      setRecommendations(response.recomendaciones);
    } catch (error) {
      console.error('Error al cargar recomendaciones:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const cargarHistory = async () => {
    if (!historyMetrics) setLoadingHistory(true);
    try {
      const metrics = await alertService.getRecommendationMetrics();
      setHistoryMetrics(metrics);
    } catch (error) {
      console.error('Error al cargar historial de recomendaciones:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const cargarHistoryList = async () => {
    if (historyItems.length === 0) setLoadingHistoryList(true);
    try {
      const response = await alertService.getRecommendationHistory({
        pagina: historyPagina,
        limite: 10
      });
      setHistoryItems(response.items);
      setHistoryTotal(response.total);
      setHistoryTotalPaginas(response.totalPaginas);
    } catch (error) {
      console.error('Error al cargar historial de decisiones:', error);
    } finally {
      setLoadingHistoryList(false);
    }
  };

  const handleReopenRecommendation = async (id: number) => {
    if (!esGerente) return;
    try {
      const result = await alertService.reopenRecommendation(id);
      // En vista pendientes: insertarla localmente sin recargar toda la lista
      if (recFilter === 'pendientes' && result.recomendacion) {
        setRecommendations(prev => {
          if (prev.some(r => r.id === result.recomendacion!.id)) return prev;
          return [result.recomendacion!, ...prev];
        });
      } else if (recFilter !== 'pendientes') {
        cargarRecommendations();
      }
      cargarHistory();
      cargarHistoryList();
    } catch (error) {
      console.error('Error al reabrir recomendación:', error);
      alert('Error al reabrir la recomendación');
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
      cargarHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'recommendations') {
      cargarHistoryList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyPagina]);

  useEffect(() => {
    if (activeTab === 'recommendations') {
      cargarRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recFilter]);

  const handleCheckAlerts = async () => {
    if (!esGerente) return;

    try {
      await alertService.checkAlerts();
      cargarAlerts();
    } catch (error) {
      console.error('Error al verificar alertas:', error);
    }
  };

  const handleRecommendationAction = async (id: number, action: 'accept' | 'reject', data?: RecommendationActionData) => {
    if (!esGerente) return;
    try {
      // Removida la recomendación resuelta de la vista sin recargar toda la lista
      const resuelta = recommendations.find(r => r.id === id);
      if (resuelta) {
        setRecommendations(prev => prev.filter(r => r.id !== id));
      }
      await alertService.updateRecommendationStatus(id, action, data);
      cargarHistory();
      cargarHistoryList();
    } catch (error) {
      console.error(`Error al procesar acción ${action}:`, error);
      alert('Error al procesar la acción');
      cargarRecommendations();
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!esGerente) return;
    try {
      const result = await alertService.generateRecommendations();
      cargarRecommendations();
      cargarHistory();
      cargarHistoryList();
      if (result.nuevas > 0) {
        alert(`Se generaron ${result.nuevas} nuevas recomendaciones`);
      }
    } catch (error) {
      console.error('Error al generar recomendaciones:', error);
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
      demand_trend: 'Tendencia de Demanda',
      liquidez_baja: 'Liquidez Baja'
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
    if (loadingRecommendations && recommendations.length === 0) {
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
      const emptyMessages: Record<string, { text: string; hint: string }> = {
        pendientes: {
          text: 'No hay recomendaciones pendientes',
          hint: 'Las recomendaciones se generan automáticamente basándose en las alertas activas.'
        },
        aceptadas: { text: 'Aún no has aceptado recomendaciones', hint: 'Cuando aceptes una sugerencia, aparecerá aquí.' },
        rechazadas: { text: 'No hay recomendaciones rechazadas', hint: 'Las sugerencias que rechaces se listarán aquí.' },
        todas: { text: 'No hay recomendaciones registradas', hint: 'Se generarán automáticamente desde las alertas activas.' }
      };
      const msg = emptyMessages[recFilter] || emptyMessages.pendientes;
      return (
        <div className="empty-state">
          <i className='bx bx-check-circle'></i>
          <p>{msg.text}</p>
          <p className="empty-hint">{msg.hint}</p>
        </div>
      );
    }

    return (
      <div className="recommendations-container">
        <RecommendationHistory metricas={historyMetrics} loading={loadingHistory} />
        <div className="recommendations-list">
          {recommendations
            .filter(rec => !priorityFilter || rec.prioridad === priorityFilter)
            .map((rec) => (
            <RecommendationCard 
              key={rec.id} 
              recommendation={rec} 
              onAccept={(id, data) => handleRecommendationAction(id, 'accept', data)}
              onReject={(id) => handleRecommendationAction(id, 'reject')}
            />
          ))}
        </div>

        <RecommendationHistoryList
          items={historyItems}
          total={historyTotal}
          pagina={historyPagina}
          totalPaginas={historyTotalPaginas}
          loading={loadingHistoryList}
          esGerente={esGerente}
          onReopen={handleReopenRecommendation}
          onPageChange={setHistoryPagina}
        />
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
                    <option value="liquidez_baja">Liquidez Baja</option>
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
                            <td>{alert.product?.nombre || (alert.type === 'liquidez_baja' ? 'TESORERÍA' : 'N/A')}</td>
                            <td>{new Date(alert.createdAt).toLocaleDateString()}</td>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  {esGerente && (
                    <button className="btn btn-secondary" onClick={handleGenerateRecommendations}>
                      <i className='bx bx-brain'></i> Generar nuevas
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => { cargarRecommendations(); cargarHistory(); cargarHistoryList(); }}>
                    <i className='bx bx-refresh'></i> Actualizar
                  </button>
                </div>
              </div>
              <div className="recommendations-filter">
                {([
                  ['pendientes', 'Pendientes'],
                  ['aceptadas', 'Aceptadas'],
                  ['rechazadas', 'Rechazadas'],
                  ['todas', 'Todas']
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    className={`rec-filter-btn ${recFilter === value ? 'active' : ''}`}
                    onClick={() => setRecFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="recommendations-filter">
                {prioridades.map(([value, label]) => (
                  <button
                    key={value}
                    className={`rec-filter-btn priority-filter-btn ${priorityFilter === value ? 'active' : ''}`}
                    onClick={() => setPriorityFilter(value)}
                  >
                    {label}
                  </button>
                ))}
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
