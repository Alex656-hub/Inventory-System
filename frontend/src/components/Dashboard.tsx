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

  if (loading) {
    return <div className="dashboard loading">Cargando dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard de Inventario</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total de Productos</h3>
          <p className="stat-value">{totalProductos}</p>
        </div>
        <div className="stat-card">
          <h3>Valor del Inventario</h3>
          <p className="stat-value">S/ {valorInventario.toFixed(2)}</p>
        </div>
        <div className="stat-card warning">
          <h3>Productos con Stock Bajo</h3>
          <p className="stat-value">{productosStockBajo.length}</p>
        </div>
      </div>

      {productosStockBajo.length > 0 && (
        <div className="alertas-section">
          <h2>⚠️ Alertas de Stock Bajo</h2>
          <div className="alertas-list">
            {productosStockBajo.map((producto) => (
              <div key={producto.id} className="alerta-item">
                <div>
                  <strong>{producto.nombre}</strong>
                  <span className="codigo">({producto.codigo})</span>
                </div>
                <div className="stock-info">
                  <span>Stock: {producto.stock_actual}</span>
                  <span>Mínimo: {producto.stock_minimo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

