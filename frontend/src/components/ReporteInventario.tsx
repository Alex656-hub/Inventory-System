import React, { useState, useEffect } from 'react';
import './ReporteInventario.css';
import api from '../config/api';
import ModalInventarioExcel from './ModalInventarioExcel';

interface StockItem {
  codigo: string;
  nombre: string;
  categoria: string;
  sede: string;
  almacen: string;
  stock_actual: number;
  unidad: string;
  costo_unitario: number;
  valor_total: number;
}

interface SedeOption {
  id: number;
  nombre: string;
}

const ReporteInventario: React.FC = () => {
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [filasVisibles, setFilasVisibles] = useState(20);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    cargarSedes();
    cargarDatos();
  }, []);

  const cargarSedes = async () => {
    try {
      const response = await api.get('/sedes');
      const data = response.data.sedes || response.data;
      setSedes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar sedes:', error);
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/inventario-data');
      setStockData(response.data.productos || []);
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = stockData.filter(item => {
    if (filtro && !item.nombre.toLowerCase().includes(filtro.toLowerCase()) &&
        !item.codigo.toLowerCase().includes(filtro.toLowerCase()) &&
        !item.categoria.toLowerCase().includes(filtro.toLowerCase()) &&
        !item.sede.toLowerCase().includes(filtro.toLowerCase())) {
      return false;
    }
    if (filtroSede && item.sede !== sedes.find(s => s.id === Number(filtroSede))?.nombre) {
      return false;
    }
    if (filtroCategoria && item.categoria !== filtroCategoria) {
      return false;
    }
    return true;
  });

  const categorias = Array.from(new Set(stockData.map(i => i.categoria))).filter(Boolean).sort();

  const paginatedData = filteredData.slice(0, filasVisibles);

  const totalValorInventario = filteredData.reduce((sum, item) => sum + item.valor_total, 0);
  const totalStock = filteredData.reduce((sum, item) => sum + item.stock_actual, 0);

  return (
    <div className="ri-container">
      <div className="ri-header">
        <div className="ri-header-left">
          <h2>Reporte de Inventario</h2>
          <p>Estado actual del stock por sede.</p>
        </div>

        <div className="ri-metricas">
          <div className="ri-metrica-item">
            <span className="ri-metrica-label">Total Unidades</span>
            <span className="ri-metrica-valor">{totalStock}</span>
          </div>
          <div className="ri-metrica-item verde">
            <span className="ri-metrica-label">Valorizado</span>
            <span className="ri-metrica-valor">S/ {totalValorInventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="ri-filtros">
        <div className="ri-filtro-grupo">
          <label>Exportar</label>
          <button className="ri-btn-excel" onClick={() => setShowExportModal(true)}>
            📊 Excel
          </button>
        </div>

        <div className="ri-filtro-grupo">
          <label>Sede</label>
          <select value={filtroSede} onChange={(e) => setFiltroSede(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="ri-filtro-grupo">
          <label>Categoría</label>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="ri-filtro-grupo">
          <label>Mostrar Filas</label>
          <select className="ri-select-sm" value={filasVisibles} onChange={(e) => setFilasVisibles(Number(e.target.value))}>
            <option value={10}>10 filas</option>
            <option value={20}>20 filas</option>
            <option value={50}>50 filas</option>
            <option value={100}>100 filas</option>
          </select>
        </div>

        <div className="ri-filtro-grupo" style={{ flex: 1 }}>
          <label>Buscar</label>
          <div className="ri-buscar-wrapper">
            <span className="ri-buscar-icono">🔍</span>
            <input
              type="text"
              placeholder="Nombre o Código..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="ri-tabla-container">
        <table className="ri-tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Ubicación</th>
              <th>Stock</th>
              <th>Unidad</th>
              <th>Costo Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="ri-loading">Cargando...</td></tr>
            ) : paginatedData.length === 0 ? (
              <tr><td colSpan={8} className="ri-empty">No hay datos de inventario</td></tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'ri-row-even' : 'ri-row-odd'}>
                  <td>{item.codigo}</td>
                  <td>{item.nombre}</td>
                  <td><span className="ri-badge">{item.categoria}</span></td>
                  <td>{item.sede}{item.almacen ? ` / ${item.almacen}` : ''}</td>
                  <td className="ri-numero">{item.stock_actual}<span className="ri-stock-und"> und</span></td>
                  <td>{item.unidad}</td>
                  <td className="ri-numero">S/ {item.costo_unitario.toFixed(2)}</td>
                  <td className="ri-numero">S/ {item.valor_total.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="ri-footer">
              <td colSpan={4}><strong>RESUMEN</strong></td>
              <td className="ri-numero"><strong>{totalStock}</strong></td>
              <td></td>
              <td></td>
              <td className="ri-numero"><strong>S/ {totalValorInventario.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showExportModal && (
        <ModalInventarioExcel onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
};

export default ReporteInventario;