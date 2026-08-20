import React, { useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import { salesService, SalesSummary } from '../services/sales.service';
import { alertService, InventoryMetrics } from '../services/alert.service';
import operacionStockService from '../services/operacionStock.service';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Producto } from '../types';
import './Dashboard.css';

const COLORS = {
  primary: '#00a6f4',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  muted: '#94a3b8',
  pie: ['#00a6f4', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tooltip">
      <p className="dash-tooltip-label">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="dash-tooltip-value">
          {entry.name}: {typeof entry.value === 'number' ? `S/ ${entry.value.toLocaleString('es-PE')}` : entry.value}
        </p>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [productosStockBajo, setProductosStockBajo] = useState<Producto[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [valorInventario, setValorInventario] = useState(0);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tendencia, setTendencia] = useState<Array<{
    fecha: string;
    ENTRADA: number;
    SALIDA: number;
    TRASPASO: number;
  }>>([]);
  const [metricasPorSede, setMetricasPorSede] = useState<Array<{
    sede: string;
    ENTRADA: number;
    SALIDA: number;
    TRASPASO: number;
    costoTotal: number;
  }>>([]);
  const [topProv, setTopProv] = useState<Array<{
    proveedorId: number;
    nombre: string;
    totalOperaciones: number;
    montoTotal: number;
  }>>([]);
  const [topCli, setTopCli] = useState<Array<{
    clienteId: number;
    nombre: string;
    totalOperaciones: number;
    montoTotal: number;
  }>>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [stockBajo, todos, summary, metrics, tendenciaData, metricasData, provData, cliData] = await Promise.allSettled([
        productService.obtenerProductosStockBajo(),
        productService.obtenerProductos({ limite: 1000, activo: true }),
        salesService.getSalesSummary(),
        alertService.getAnalytics(),
        operacionStockService.obtenerTendencia(30),
        operacionStockService.obtenerMetricasPorSede(6),
        operacionStockService.topProveedores(5, 6),
        operacionStockService.topClientes(5, 6)
      ]);

      if (stockBajo.status === 'fulfilled') {
        setProductosStockBajo(stockBajo.value.productos);
      }

      if (todos.status === 'fulfilled') {
        setTotalProductos(todos.value.paginacion.total);
        const valorTotal = todos.value.productos.reduce((sum, prod) => {
          return sum + Number(prod.stock_actual) * Number(prod.precio_compra);
        }, 0);
        setValorInventario(valorTotal);
      }

      if (summary.status === 'fulfilled' && summary.value.success) {
        setSalesSummary(summary.value.data);
      }

      if (metrics.status === 'fulfilled') {
        setInventoryMetrics(metrics.value);
      }

      if (tendenciaData.status === 'fulfilled') {
        setTendencia(tendenciaData.value);
      }

      if (metricasData.status === 'fulfilled') {
        setMetricasPorSede(metricasData.value);
      }

      if (provData.status === 'fulfilled') {
        setTopProv(provData.value);
      }

      if (cliData.status === 'fulfilled') {
        setTopCli(cliData.value);
      }
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Chart data
  const salesTrendData = salesSummary?.salesTrend?.map(d => ({
    date: new Date(d.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    Ventas: d.totalSales,
    Ganancia: d.totalProfit,
  })) || [];

  const categoryData = salesSummary?.byCategory?.slice(0, 6).map(c => ({
    name: c.categoryName,
    value: c.totalSales,
  })) || [];

  const topProductsData = salesSummary?.byProduct?.slice(0, 5).map(p => ({
    name: p.producto.nombre.length > 20 ? p.producto.nombre.substring(0, 20) + '...' : p.producto.nombre,
    Cantidad: p.totalQuantity,
  })) || [];

  const stagnantData = inventoryMetrics ? [
    { name: 'Lentos', value: inventoryMetrics.productosLentos, fill: COLORS.warning },
    { name: 'Sin Movimiento', value: inventoryMetrics.sinMovimiento, fill: COLORS.danger },
    { name: 'Stock Muerto', value: inventoryMetrics.stockMuerto, fill: '#6b7280' },
  ] : [];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card skeleton">
              <div className="skeleton-header">
                <div className="skeleton-icon"></div>
                <div className="skeleton-badge"></div>
              </div>
              <div className="skeleton-content">
                <div className="skeleton-label"></div>
                <div className="skeleton-value"></div>
                <div className="skeleton-meta"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="charts-grid">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-chart skeleton">
              <div className="skeleton-chart-title"></div>
              <div className="skeleton-chart-area"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="module-title">Dashboard de Inventario</h1>
          <p className="module-subtitle">Resumen general del estado de tu inventario</p>
        </div>
      </div>

      {/* Row 1: Inventory Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon blue">
              <i className='bx bx-package'></i>
            </div>
            <span className="stat-card-badge green">Activo</span>
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Total de Productos</p>
            <p className="stat-card-value">{totalProductos}</p>
            <p className="stat-card-meta">productos registrados en sistema</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon green">
              <i className='bx bx-dollar'></i>
            </div>
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Valor del Inventario</p>
            <p className="stat-card-value">{formatCurrency(valorInventario)}</p>
            <p className="stat-card-meta">valor total en almacén</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon amber">
              <i className='bx bx-error'></i>
            </div>
            {productosStockBajo.length > 0 && (
              <span className="stat-card-badge amber">Atención</span>
            )}
          </div>
          <div className="stat-card-content">
            <p className="stat-card-label">Stock Bajo</p>
            <p className="stat-card-value">{productosStockBajo.length}</p>
            <p className="stat-card-meta">productos requieren reposición</p>
          </div>
        </div>
      </div>

      {/* Row 2: Sales KPIs */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-icon kpi-sales">
            <i className='bx bx-bar-chart'></i>
          </div>
          <div className="kpi-content">
            <p className="kpi-value">{formatCurrency(salesSummary?.totals?.totalSales || 0)}</p>
            <p className="kpi-label">Ventas Totales</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-profit">
            <i className='bx bx-trending-up'></i>
          </div>
          <div className="kpi-content">
            <p className="kpi-value">{formatCurrency(salesSummary?.totals?.totalProfit || 0)}</p>
            <p className="kpi-label">Ganancia</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-transactions">
            <i className='bx bx-shopping-bag'></i>
          </div>
          <div className="kpi-content">
            <p className="kpi-value">{(salesSummary?.totals?.totalTransactions || 0).toLocaleString('es-PE')}</p>
            <p className="kpi-label">Transacciones</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1: 2 charts */}
      <div className="charts-grid">
        {/* Sales Trend */}
        <div className="chart-card chart-wide">
          <div className="chart-card-header">
            <h3>Tendencia de Ventas</h3>
          </div>
          <div className="chart-card-body">
            {salesTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="legend-text">{value}</span>} />
                  <Line type="monotone" dataKey="Ventas" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Ganancia" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos de ventas</div>
            )}
          </div>
        </div>

        {/* Category Pie */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Ventas por Categoría</h3>
          </div>
          <div className="chart-card-body">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                  <Legend formatter={(value) => <span className="legend-text">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos por categoría</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Top Products + Stagnant */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Top 5 Productos</h3>
          </div>
          <div className="chart-card-body">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="Cantidad" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos de productos</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Productos Estancados</h3>
          </div>
          <div className="chart-card-body">
            {stagnantData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stagnantData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                    {stagnantData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">No hay productos estancados</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 4: Operaciones - Tendencia + Sede */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Tendencia de Operaciones (30 días)</h3>
          </div>
          <div className="chart-card-body">
            {tendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    labelFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
                    }}
                  />
                  <Legend formatter={(value) => <span className="legend-text">{value}</span>} />
                  <Line type="monotone" dataKey="ENTRADA" stroke={COLORS.success} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="SALIDA" stroke={COLORS.danger} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="TRASPASO" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos de tendencia</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Operaciones por Sede (6 meses)</h3>
          </div>
          <div className="chart-card-body">
            {metricasPorSede.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metricasPorSede}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="sede" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend formatter={(value) => <span className="legend-text">{value}</span>} />
                  <Bar dataKey="ENTRADA" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="SALIDA" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="TRASPASO" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos por sede</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 5: Top Proveedores + Clientes */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Top Proveedores</h3>
          </div>
          <div className="chart-card-body">
            {topProv.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProv} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Monto']} />
                  <Bar dataKey="montoTotal" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos de proveedores</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Top Clientes</h3>
          </div>
          <div className="chart-card-body">
            {topCli.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topCli} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Monto']} />
                  <Bar dataKey="montoTotal" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">Sin datos de clientes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
