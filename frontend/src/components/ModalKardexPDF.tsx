import React, { useState, useEffect } from 'react';
import './ModalKardexPDF.css';
import { productService } from '../services/product.service';
import { reporteService } from '../services/reporte.service';
import { Producto } from '../types';

interface ModalKardexPDFProps {
  onClose: () => void;
}

const ModalKardexPDF: React.FC<ModalKardexPDFProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      const response = await productService.obtenerProductos({ activo: true, limite: 100 });
      setProductos(response.productos);
      setFilteredProductos(response.productos);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim() === '') {
      setFilteredProductos(productos);
    } else {
      const filtered = productos.filter(p =>
        p.nombre.toLowerCase().includes(value.toLowerCase()) ||
        p.codigo.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredProductos(filtered);
    }
    setShowDropdown(true);
  };

  const handleSelectProduct = (producto: Producto) => {
    setSelectedProduct(producto);
    setSearchTerm(`${producto.codigo} - ${producto.nombre}`);
    setShowDropdown(false);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setFilteredProductos(productos);
  };

  const handleDescargar = async () => {
    if (!selectedProduct) {
      alert('Por favor seleccione un producto');
      return;
    }

    if (!fechaDesde || !fechaHasta) {
      alert('Por favor seleccione el período');
      return;
    }

    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      alert('La fecha "Desde" no puede ser mayor que la fecha "Hasta"');
      return;
    }

    setLoading(true);
    try {
      const blob = await reporteService.generarKardexPDF({
        producto_id: selectedProduct.id,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
      });

      const filename = `kardex_${selectedProduct.codigo}_${fechaDesde}_${fechaHasta}.pdf`;
      reporteService.descargarBlob(blob, filename);
      onClose();
    } catch (error) {
      console.error('Error al generar Kardex PDF:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-kardex-overlay" onClick={onClose}>
      <div className="modal-kardex-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-kardex-header">
          <h3>Generar Kardex Físico (PDF)</h3>
          <button className="modal-kardex-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-kardex-body">
          <div className="mk-form-group">
            <label>Producto Objetivo</label>
            <div className="mk-input-wrapper">
              <input
                type="text"
                placeholder="Buscar producto por código o nombre..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
              />
              {selectedProduct && (
                <button className="mk-clear-btn" onClick={handleClearProduct}>×</button>
              )}
              <span className="mk-dropdown-icon">⌄</span>
              
              {showDropdown && filteredProductos.length > 0 && (
                <div className="mk-dropdown">
                  {filteredProductos.slice(0, 10).map(producto => (
                    <div
                      key={producto.id}
                      className="mk-dropdown-item"
                      onClick={() => handleSelectProduct(producto)}
                    >
                      <span className="mk-product-code">{producto.codigo}</span>
                      <span className="mk-product-name">{producto.nombre}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mk-form-row">
            <div className="mk-form-group">
              <label>Desde</label>
              <div className="mk-input-wrapper">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
                <span className="mk-calendar-icon">📅</span>
              </div>
            </div>

            <div className="mk-form-group">
              <label>Hasta</label>
              <div className="mk-input-wrapper">
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
                <span className="mk-calendar-icon">📅</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-kardex-footer">
          <button className="mk-btn mk-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="mk-btn mk-btn-download"
            onClick={handleDescargar}
            disabled={loading || !selectedProduct || !fechaDesde || !fechaHasta}
          >
            {loading ? 'Generando...' : 'Descargar'} ↓
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalKardexPDF;