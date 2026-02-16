import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { salesService, Sale, SalesResponse } from '../services/sales.service';
import './SalesList.css';

interface SalesListProps {
  startDate?: string;
  endDate?: string;
  productId?: number;
}

const SalesList: React.FC<SalesListProps> = ({ startDate, endDate, productId }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // URL search params
  const [searchParams] = useSearchParams();
  const ventaId = searchParams.get('ventaId');

  // Ref for scrolling to focused sale
  const salesContainerRef = useRef<HTMLDivElement>(null);

  const limit = 10;

  const fetchSales = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await salesService.getSales({
        page,
        limit,
        startDate,
        endDate,
        productId
      });

      if (response.success) {
        setSales(response.data.data);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      } else {
        setError('Error al cargar las ventas');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [startDate, endDate, productId]);

  // Handle ventaId parameter
  useEffect(() => {
    if (ventaId && sales.length > 0) {
      // Scroll to the focused sale
      const saleElement = document.getElementById(`sale-${ventaId}`);
      if (saleElement) {
        saleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        saleElement.classList.add('highlighted');
        // Remove highlight after a few seconds
        setTimeout(() => {
          saleElement.classList.remove('highlighted');
        }, 3000);
      }
    }
  }, [ventaId, sales]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchSales(page);
    }
  };

  const toggleRowExpansion = (saleId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  if (loading && sales.length === 0) {
    return (
      <div className="sales-list">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando ventas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-list">
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => fetchSales(currentPage)} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-list">
      <div className="sales-header">
        <h2>Ventas</h2>
        <div className="sales-info">
          <span className="total-count">
            Total: {total} venta{total !== 1 ? 's' : ''}
          </span>
          {totalPages > 1 && (
            <span className="page-info">
              Página {currentPage} de {totalPages}
            </span>
          )}
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="no-sales">
          <p>No se encontraron ventas</p>
        </div>
      ) : (
        <>
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <React.Fragment key={sale.id}>
                    <tr id={`sale-${sale.id}`} className="sale-row">
                      <td>{formatDate(sale.fecha)}</td>
                      <td>#{sale.id}</td>
                      <td>{sale.usuario.nombre}</td>
                      <td className="amount">{formatCurrency(sale.total)}</td>
                      <td>
                        <span className={`status ${sale.estado}`}>
                          {sale.estado}
                        </span>
                      </td>
                      <td>
                        <button
                          className="expand-button"
                          onClick={() => toggleRowExpansion(sale.id)}
                        >
                          {expandedRows.has(sale.id) ? '▼' : '▶'}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(sale.id) && (
                      <tr className="details-row">
                        <td colSpan={6}>
                          <div className="sale-details">
                            <h4>Detalles de la venta</h4>
                            <table className="details-table">
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Código</th>
                                  <th>Cantidad</th>
                                  <th>Precio Unit.</th>
                                  <th>Subtotal</th>
                                  <th>Categoría</th>
                                  <th>Proveedor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.detalles.map((detail) => (
                                  <tr key={detail.id}>
                                    <td className="product-name">{detail.producto.nombre}</td>
                                    <td>{detail.producto.codigo}</td>
                                    <td>{detail.cantidad}</td>
                                    <td>{formatCurrency(detail.producto.precio_venta)}</td>
                                    <td className="amount">{formatCurrency(detail.subtotal)}</td>
                                    <td>{detail.producto.categoria.nombre}</td>
                                    <td>{detail.producto.proveedor.nombre}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesList;
