import React, { useState, useEffect } from 'react';
import { salesService, type SalesSummary as SalesSummaryData, type SalesSummaryResponse } from '../services/sales.service';
import './SalesSummary.css';

interface SalesSummaryProps {
  startDate?: string;
  endDate?: string;
}

const SalesSummaryPage: React.FC<SalesSummaryProps> = ({ startDate, endDate }) => {
  const [summary, setSummary] = useState<SalesSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await salesService.getSalesSummary({
        startDate,
        endDate
      });

      if (response.success) {
        setSummary(response.data);
      } else {
        setError('Error al cargar el resumen de ventas');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cargar el resumen de ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('es-PE').format(amount);
  };

  if (loading) {
    return (
      <div className="sales-summary">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-summary">
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchSummary} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="sales-summary">
        <div className="no-data">
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-summary">
      <div className="summary-header">
        <h2>Resumen de Ventas</h2>
        <button onClick={fetchSummary} className="refresh-button">
          🔄 Actualizar
        </button>
      </div>

      {/* Tarjetas de totales */}
      <div className="totals-grid">
        <div className="total-card sales">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Ventas Totales</h3>
            <p className="amount">{formatCurrency(summary.totals.totalSales)}</p>
            <span className="transactions">{summary.totals.totalTransactions} transacciones</span>
          </div>
        </div>

        <div className="total-card cost">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <h3>Costo Total</h3>
            <p className="amount">{formatCurrency(summary.totals.totalCost)}</p>
            <span className="transactions">Costo de productos</span>
          </div>
        </div>

        <div className="total-card profit">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>Ganancia Total</h3>
            <p className="amount">{formatCurrency(summary.totals.totalProfit)}</p>
            <span className="transactions">Margen de beneficio</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Ventas por categoría */}
        <div className="chart-card">
          <h3>Ventas por Categoría</h3>
          <div className="category-list">
            {summary.byCategory.map((category, index) => (
              <div key={index} className="category-item">
                <div className="category-info">
                  <span className="category-name">{category.categoryName}</span>
                  <span className="category-amount">{formatCurrency(category.totalSales)}</span>
                </div>
                <div className="category-bar">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${(category.totalSales / Math.max(...summary.byCategory.map(c => c.totalSales))) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="category-details">
                  <span>{category.transactionCount} ventas</span>
                  <span className="profit">{formatCurrency(category.totalProfit)} ganancia</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className="chart-card">
          <h3>Productos Más Vendidos</h3>
          <div className="product-list">
            {summary.byProduct.map((product, index) => (
              <div key={index} className="product-item">
                <div className="product-rank">#{index + 1}</div>
                <div className="product-info">
                  <div className="product-name">{product.producto.nombre}</div>
                  <div className="product-code">{product.producto.codigo}</div>
                </div>
                <div className="product-stats">
                  <div className="quantity">{formatNumber(product.totalQuantity)} unidades</div>
                  <div className="amount">{formatCurrency(product.totalSales)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tendencia de ventas */}
      <div className="chart-card full-width">
        <h3>Tendencia de Ventas</h3>
        <div className="trend-chart">
          <div className="trend-bars">
            {summary.salesTrend.map((trend, index) => (
              <div key={index} className="trend-item">
                <div className="trend-bar-container">
                  <div 
                    className="trend-bar sales" 
                    style={{ 
                      height: `${(trend.totalSales / Math.max(...summary.salesTrend.map(t => t.totalSales))) * 100}%` 
                    }}
                    title={`Ventas: ${formatCurrency(trend.totalSales)}`}
                  ></div>
                  <div 
                    className="trend-bar profit" 
                    style={{ 
                      height: `${(trend.totalProfit / Math.max(...summary.salesTrend.map(t => t.totalProfit))) * 100}%` 
                    }}
                    title={`Ganancia: ${formatCurrency(trend.totalProfit)}`}
                  ></div>
                </div>
                <div className="trend-label">
                  <div className="date">{new Date(trend.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</div>
                  <div className="transactions">{trend.transactionCount} ventas</div>
                </div>
              </div>
            ))}
          </div>
          <div className="trend-legend">
            <div className="legend-item">
              <div className="legend-color sales"></div>
              <span>Ventas</span>
            </div>
            <div className="legend-item">
              <div className="legend-color profit"></div>
              <span>Ganancia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummaryPage;
