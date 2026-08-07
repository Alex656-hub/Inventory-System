import React, { useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { InventoryMetrics } from '../services/alert.service';
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
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
