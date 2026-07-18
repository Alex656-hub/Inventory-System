import React, { useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import { Producto } from '../types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [productosStockBajo, setProductosStockBajo] = useState<Producto[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [valorInventario, setValorInventario] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const stockBajo = await productService.obtenerProductosStockBajo();
      setProductosStockBajo(stockBajo.productos);

      const todos = await productService.obtenerProductos({ limite: 1000, activo: true });
      setTotalProductos(todos.paginacion.total);

      const valorTotal = todos.productos.reduce((sum, prod) => {
        return sum + Number(prod.stock_actual) * Number(prod.precio_compra);
      }, 0);
      setValorInventario(valorTotal);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (producto: Producto) => {
    const stock = Number(producto.stock_actual);
    const minimo = Number(producto.stock_minimo);
    if (stock === 0) return 'critical';
    if (stock <= minimo * 0.5) return 'critical';
    return 'warning';
  };

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
        <div className="skeleton-alerts">
          <div className="skeleton-alerts-title skeleton"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-alert-item skeleton">
              <div className="skeleton-alert-dot"></div>
              <div className="skeleton-alert-content">
                <div className="skeleton-alert-name"></div>
                <div className="skeleton-alert-code"></div>
              </div>
              <div className="skeleton-alert-stock"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1 className="module-title">Dashboard de Inventario</h1>
      <p className="module-subtitle">Resumen general del estado de tu inventario</p>

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
            <p className="stat-card-value">S/ {valorInventario.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

      {productosStockBajo.length > 0 ? (
        <div className="alerts-section">
          <div className="alerts-header">
            <h2 className="alerts-title">
              <span className="alerts-title-icon">
                <i className='bx bx-bell'></i>
              </span>
              Alertas de Stock Bajo
            </h2>
            <span className="alerts-count">{productosStockBajo.length} alertas</span>
          </div>
          <div className="alerts-list">
            {productosStockBajo.map((producto) => {
              const status = getStockStatus(producto);
              return (
                <div key={producto.id} className="alert-item">
                  <div className={`alert-item-dot ${status}`}></div>
                  <div className="alert-item-content">
                    <p className="alert-item-name">{producto.nombre}</p>
                    <p className="alert-item-code">{producto.codigo}</p>
                  </div>
                  <div className="alert-item-stock">
                    <div className="stock-info-item">
                      <span className="stock-info-label">Actual</span>
                      <span className={`stock-info-value ${status}`}>{producto.stock_actual}</span>
                    </div>
                    <div className="stock-info-item">
                      <span className="stock-info-label">Mínimo</span>
                      <span className="stock-info-value">{producto.stock_minimo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="alerts-section">
          <div className="empty-alerts">
            <div className="empty-alerts-icon">
              <i className='bx bx-check-circle'></i>
            </div>
            <p className="empty-alerts-title">Todo en orden</p>
            <p className="empty-alerts-text">No hay productos con stock bajo en este momento</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
