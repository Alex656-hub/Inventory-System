import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { InventoryMetrics, alertService, AgingBucket, AdvancedForecast } from '../services/alert.service';
import { productService } from '../services/product.service';
import { Producto } from '../types';
import './AnalyticsDashboard.css';

type DatePreset = '7d' | '30d' | '90d' | 'custom';

interface DateRange {
  fechaInicio: string;
  fechaFin: string;
}

const DATE_PRESETS: { label: string; value: DatePreset; days: number }[] = [
  { label: 'Últimos 7 días', value: '7d', days: 7 },
  { label: 'Últimos 30 días', value: '30d', days: 30 },
  { label: 'Últimos 90 días', value: '90d', days: 90 },
];

const COLORS = {
  primary: '#00a6f4',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  muted: '#94a3b8',
  surface: '#f1f5f9',
  pie: ['#00a6f4', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899'],
};

const formatCurrency = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPercent = (value: number) => `${value}%`;
const formatNumber = (value: number) => value.toLocaleString('es-PE');

const formatAxisDate = (value: string) => {
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="chart-tooltip-value">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('es-PE') : entry.value}
        </p>
      ))}
    </div>
  );
};

interface AnalyticsDashboardProps {
  metrics: InventoryMetrics | null;
  loading: boolean;
  onRefresh: (params?: { fechaInicio?: string; fechaFin?: string }) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ metrics, loading, onRefresh }) => {
  const [datePreset, setDatePreset] = useState<DatePreset>('90d');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    fechaInicio: '',
    fechaFin: ''
  });
  const [loadingChart, setLoadingChart] = useState(false);
  const [projections, setProjections] = useState<any[]>([]);
  const [breakEven, setBreakEven] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [aging, setAging] = useState<AgingBucket>({ actual: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [forecastDays, setForecastDays] = useState<number>(30);
  const [forecast, setForecast] = useState<AdvancedForecast | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    const loadFinancialData = async () => {
      setLoadingFinancial(true);
      try {
        const [projRes, breakRes, agingRes] = await Promise.all([
          alertService.getFinancialProjections(6),
          alertService.getBreakEvenPoint(),
          alertService.getAging()
        ]);
        setProjections(projRes.data || []);
        setBreakEven(breakRes.data || null);
        setAging(agingRes);
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoadingFinancial(false);
      }
    };
    loadFinancialData();
  }, []);

  useEffect(() => {
    let active = true;
    productService.obtenerProductos({ limite: 1000, activo: true })
      .then(res => {
        if (!active) return;
        setProductos(res.productos);
        if (res.productos.length > 0) {
          setSelectedProductId(prev => (prev === null ? res.productos[0].id : prev));
        }
      })
      .catch(() => {
        if (active) setForecastError('No se pudieron cargar los productos');
      });
    return () => { active = false; };
  }, []);

  const cargarForecast = useCallback(async (productId: number, days: number) => {
    setLoadingForecast(true);
    setForecastError(null);
    try {
      const data = await alertService.getAdvancedForecast(productId, days);
      setForecast(data);
    } catch (error: any) {
      setForecast(null);
      setForecastError(
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message ||
        'Error al generar el pronóstico'
      );
    } finally {
      setLoadingForecast(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      cargarForecast(selectedProductId, forecastDays);
    }
  }, [selectedProductId, forecastDays, cargarForecast]);

  const getDateRange = useCallback((): DateRange => {
    const now = new Date();
    const fechaFin = now.toISOString().split('T')[0];

    if (datePreset === 'custom') {
      return customDateRange;
    }

    const preset = DATE_PRESETS.find(p => p.value === datePreset);
    const dias = preset?.days || 90;
    const fechaInicio = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { fechaInicio, fechaFin };
  }, [datePreset, customDateRange]);

  const handleDateChange = async (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      setLoadingChart(true);
      const range = getDateRange();
      await onRefresh({ fechaInicio: range.fechaInicio, fechaFin: range.fechaFin });
      setLoadingChart(false);
    }
  };

  const handleCustomDateChange = (field: 'fechaInicio' | 'fechaFin', value: string) => {
    setCustomDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyCustomRange = async () => {
    if (customDateRange.fechaInicio && customDateRange.fechaFin) {
      setLoadingChart(true);
      await onRefresh({ fechaInicio: customDateRange.fechaInicio, fechaFin: customDateRange.fechaFin });
      setLoadingChart(false);
    }
  };

  const handleRefresh = async () => {
    setLoadingChart(true);
    const range = datePreset === 'custom' ? customDateRange : getDateRange();
    await onRefresh({ fechaInicio: range.fechaInicio, fechaFin: range.fechaFin });
    setLoadingChart(false);
  };

  // Chart data
  const stockStatusData = metrics ? [
    { name: 'Stock Bajo', value: metrics.stockBajo, color: COLORS.warning },
    { name: 'Agotados', value: metrics.agotados, color: COLORS.danger },
    { name: 'Sin Problemas', value: Math.max(0, metrics.totalProductos - metrics.stockBajo - metrics.agotados), color: COLORS.success },
  ] : [];

  const inventoryTuningData = metrics ? [
    { name: 'Rotación', value: metrics.rotacion, label: `${metrics.rotacion}x` },
    { name: 'Días Inventario', value: metrics.diasInventario, label: `${metrics.diasInventario} días` },
    { name: 'Ciclo Conversión', value: metrics.cicloConversion, label: `${metrics.cicloConversion} días` },
  ] : [];

  const financialData = metrics ? [
    { name: 'Margen Bruto', value: metrics.margenBruto, fill: COLORS.success },
    { name: 'ROI Inventario', value: Math.min(metrics.roiInventario, 200), fill: COLORS.primary },
    { name: 'Precisión', value: metrics.precisionInventario, fill: COLORS.warning },
  ] : [];

  const stagnantProductsData = metrics ? [
    { name: 'Lentos', value: metrics.productosLentos, fill: COLORS.warning },
    { name: 'Sin Movimiento', value: metrics.sinMovimiento, fill: COLORS.danger },
    { name: 'Stock Muerto', value: metrics.stockMuerto, fill: '#6b7280' },
  ] : [];

  const capitalData = metrics ? [
    { name: 'Capital Inmovilizado', value: metrics.capitalInmovilizado - metrics.valorStockMuerto, color: COLORS.primary },
    { name: 'Stock Muerto', value: metrics.valorStockMuerto, color: COLORS.danger },
  ] : [];

  const forecastChartData = useMemo(() => {
    if (!forecast) return [];
    const map: Record<string, any> = {};
    (forecast.historicalData || []).forEach(h => {
      map[h.date] = { ...(map[h.date] || {}), date: h.date, quantity: h.quantity };
    });
    forecast.forecast.forEach(f => {
      map[f.date] = { ...(map[f.date] || {}), date: f.date, predicted: f.predicted, lower: f.lower, upper: f.upper };
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [forecast]);

  const isLoading = loading || loadingChart;

  if (!metrics && !loading) {
    return (
      <div className="analytics-empty">
        <i className='bx bx-error-circle'></i>
        <p>No se pudieron cargar las métricas</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header with date filter */}
      <div className="analytics-header">
        <div className="analytics-title">
          <i className='bx bx-bar-chart-alt-2'></i>
          <h2>Análisis de Inventario</h2>
        </div>
        <div className="analytics-controls">
          <div className="date-presets">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.value}
                className={`date-preset-btn ${datePreset === preset.value ? 'active' : ''}`}
                onClick={() => handleDateChange(preset.value)}
              >
                {preset.label}
              </button>
            ))}
            <button
              className={`date-preset-btn ${datePreset === 'custom' ? 'active' : ''}`}
              onClick={() => setDatePreset('custom')}
            >
              Personalizado
            </button>
          </div>
          {datePreset === 'custom' && (
            <div className="custom-date-range">
              <input
                type="date"
                value={customDateRange.fechaInicio}
                onChange={(e) => handleCustomDateChange('fechaInicio', e.target.value)}
                className="date-input"
              />
              <span className="date-separator">a</span>
              <input
                type="date"
                value={customDateRange.fechaFin}
                onChange={(e) => handleCustomDateChange('fechaFin', e.target.value)}
                className="date-input"
              />
              <button className="apply-date-btn" onClick={handleApplyCustomRange}>
                Aplicar
              </button>
            </div>
          )}
          <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
            <i className={`bx bx-refresh ${isLoading ? 'spinning' : ''}`}></i>
            Actualizar
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && !metrics && (
        <div className="analytics-skeleton">
          <div className="skeleton-kpi-row">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-kpi-card skeleton">
                <div className="skeleton-kpi-icon"></div>
                <div className="skeleton-kpi-value"></div>
                <div className="skeleton-kpi-label"></div>
              </div>
            ))}
          </div>
          <div className="skeleton-charts-row">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-chart-card skeleton">
                <div className="skeleton-chart-title"></div>
                <div className="skeleton-chart-area"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard content */}
      {metrics && !isLoading && (
        <>
          {/* Row 1: KPI Cards */}
          <div className="kpi-row">
            <div className="kpi-card kpi-total">
              <div className="kpi-icon">
                <i className='bx bx-package'></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{formatNumber(metrics.totalProductos)}</div>
                <div className="kpi-label">Stock Total</div>
              </div>
            </div>
            <div className="kpi-card kpi-capital">
              <div className="kpi-icon">
                <i className='bx bx-dollar'></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{formatCurrency(metrics.capitalInmovilizado)}</div>
                <div className="kpi-label">Capital Inmovilizado</div>
              </div>
            </div>
            <div className="kpi-card kpi-roi">
              <div className="kpi-icon">
                <i className='bx bx-line-chart'></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{formatPercent(metrics.roiInventario)}</div>
                <div className="kpi-label">ROI Inventario</div>
              </div>
            </div>
            <div className="kpi-card kpi-por-cobrar">
              <div className="kpi-icon">
                <i className='bx bx-credit-card'></i>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{formatCurrency((aging.actual || 0) + (aging['1-30'] || 0))}</div>
                <div className="kpi-label">Por cobrar (30d)</div>
              </div>
            </div>
          </div>

          {/* Supplementary metrics row */}
          <div className="supplementary-metrics">
            <div className="supp-metric">
              <i className='bx bx-error'></i>
              <span className="supp-value">{metrics.stockBajo}</span>
              <span className="supp-label">Stock Bajo</span>
            </div>
            <div className="supp-metric">
              <i className='bx bx-x-circle'></i>
              <span className="supp-value">{metrics.agotados}</span>
              <span className="supp-label">Agotados</span>
            </div>
            <div className="supp-metric">
              <i className='bx bx-calendar'></i>
              <span className="supp-value">{metrics.diasInventario} días</span>
              <span className="supp-label">Días Inventario</span>
            </div>
            <div className="supp-metric">
              <i className='bx bx-time'></i>
              <span className="supp-value">{metrics.cicloConversion} días</span>
              <span className="supp-label">Ciclo Conversión</span>
            </div>
            <div className="supp-metric">
              <i className='bx bx-trending-down'></i>
              <span className="supp-value">{metrics.tasaAgotamiento}%</span>
              <span className="supp-label">Tasa Agotamiento</span>
            </div>
            <div className="supp-metric">
              <i className='bx bx-calendar-alt'></i>
              <span className="supp-value">{metrics.antiguedadPromedio} días</span>
              <span className="supp-label">Antigüedad Prom.</span>
            </div>
          </div>

          {/* Row 2: 3 charts */}
          <div className="charts-row charts-row-3">
            {/* Stock Status Pie */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Estado del Stock</h3>
              </div>
              <div className="chart-card-body">
                {metrics.totalProductos > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={stockStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {stockStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="legend-text">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Sin datos</div>
                )}
              </div>
            </div>

            {/* Inventory Tuning Bar */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Rotación e Inventario</h3>
              </div>
              <div className="chart-card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={inventoryTuningData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financial Bar */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Indicadores Financieros</h3>
              </div>
              <div className="chart-card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={financialData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, '']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {financialData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: 2 charts */}
          <div className="charts-row charts-row-2">
            {/* Stagnant Products */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Productos Estancados</h3>
              </div>
              <div className="chart-card-body">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stagnantProductsData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                      {stagnantProductsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Capital Donut */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Capital vs Stock Muerto</h3>
              </div>
              <div className="chart-card-body">
                {metrics.capitalInmovilizado > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={capitalData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {capitalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), '']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="legend-text">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Sin datos de capital</div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Projections */}
          <div className="analytics-section">
            <h3 className="section-title">
              <i className='bx bx-line-chart'></i>
              Proyecciones Financieras
            </h3>
            <div className="charts-row">
              <div className="chart-card chart-wide">
                <div className="chart-card-header">
                  <h4>Proyección de Ingresos y Gastos (6 meses)</h4>
                </div>
                <div className="chart-card-body">
                  {loadingFinancial ? (
                    <div className="chart-loading">Cargando proyecciones...</div>
                  ) : projections.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={projections} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={(value) => <span className="legend-text">{value}</span>} />
                        <Bar dataKey="projectedRevenue" name="Ingresos Proyectados" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="projectedExpenses" name="Gastos Proyectados" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="projectedProfit" name="Ganancia Proyectada" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-no-data">Sin datos de proyecciones</div>
                  )}
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-card-header">
                  <h4>Punto de Equilibrio</h4>
                </div>
                <div className="chart-card-body">
                  {loadingFinancial ? (
                    <div className="chart-loading">Calculando...</div>
                  ) : breakEven ? (
                    <div className="break-even-info">
                      <div className="be-item">
                        <span className="be-label">Unidades para equilibrio</span>
                        <span className="be-value">{formatNumber(breakEven.breakEvenUnits)}</span>
                      </div>
                      <div className="be-item">
                        <span className="be-label">Costos fijos</span>
                        <span className="be-value">{formatCurrency(breakEven.fixedCosts)}</span>
                      </div>
                      <div className="be-item">
                        <span className="be-label">Precio promedio</span>
                        <span className="be-value">{formatCurrency(breakEven.averagePrice)}</span>
                      </div>
                      <div className="be-item">
                        <span className="be-label">Costo variable/unidad</span>
                        <span className="be-value">{formatCurrency(breakEven.variableCostPerUnit)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-no-data">Sin datos de equilibrio</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Demand Forecast */}
          <div className="analytics-section">
            <h3 className="section-title">
              <i className='bx bx-trending-up'></i>
              Pronóstico de Demanda
            </h3>
            <div className="forecast-controls">
              <div className="forecast-field">
                <label>Producto:</label>
                <select
                  value={selectedProductId ?? ''}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                >
                  {productos.length === 0 && <option value="">Sin productos</option>}
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="forecast-field">
                <label>Horizonte:</label>
                <select
                  value={forecastDays}
                  onChange={(e) => setForecastDays(Number(e.target.value))}
                >
                  <option value={30}>30 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
              <button
                className="refresh-btn"
                onClick={() => { if (selectedProductId) cargarForecast(selectedProductId, forecastDays); }}
                disabled={loadingForecast || !selectedProductId}
              >
                <i className={`bx bx-refresh ${loadingForecast ? 'spinning' : ''}`}></i>
                Actualizar
              </button>
            </div>

            <div className="chart-card chart-wide">
              <div className="chart-card-header">
                <h4>Ventas históricas y pronóstico</h4>
                {forecast && !loadingForecast && (
                  <div className="forecast-meta">
                    {typeof forecast.mape === 'number' && (
                      <span>MAPE: {forecast.mape.toFixed(2)}%</span>
                    )}
                    {forecast.cached && <span className="forecast-cached">En caché</span>}
                    {forecast.lastTrained && (
                      <span>Entrenado: {new Date(forecast.lastTrained).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="chart-card-body">
                {loadingForecast ? (
                  <div className="chart-loading">Calculando pronóstico...</div>
                ) : forecastError ? (
                  <div className="chart-no-data">{forecastError}</div>
                ) : forecast && forecastChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={forecastChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        minTickGap={24}
                        tickFormatter={formatAxisDate}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(value) => <span className="legend-text">{value}</span>} />
                      <Area
                        type="monotone"
                        dataKey="quantity"
                        name="Ventas históricas"
                        stroke={COLORS.muted}
                        strokeWidth={1.5}
                        fill="rgba(148,163,184,0.15)"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        name="Pronóstico"
                        stroke={COLORS.primary}
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="lower"
                        name="Límite inferior"
                        stroke={COLORS.warning}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="upper"
                        name="Límite superior"
                        stroke={COLORS.warning}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-no-data">Sin datos de pronóstico</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
