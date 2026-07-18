import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/product.service';
import { Producto } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import ProductForm from './ProductForm';
import '../styles/moduleBase.css';
import './ProductList.css';

const ProductList: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';
  const firstLoadRef = useRef(true);

  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focusId');
  const urlBusqueda = searchParams.get('busqueda');

  const cargarDatos = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading ?? true;
    if (showLoading) setLoading(true);
    try {
      const params: any = {
        pagina,
        limite: 10,
        activo: true
      };
      if (busquedaDebounced) {
        params.busqueda = busquedaDebounced;
      }
      const response = await productService.obtenerProductos(params);
      setProductos(response.productos);
      setTotalPaginas(response.paginacion.totalPaginas);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [pagina, busquedaDebounced]);

  useEffect(() => {
    if (urlBusqueda) {
      setBusqueda(urlBusqueda);
    }
    if (focusId && productos.length > 0) {
      const productElement = document.getElementById(`product-${focusId}`);
      if (productElement) {
        productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productElement.classList.add('highlighted');
        setTimeout(() => {
          productElement.classList.remove('highlighted');
        }, 3000);
      }
    }
  }, [urlBusqueda, focusId, productos]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setBusquedaDebounced(busqueda);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [busquedaDebounced]);

  useEffect(() => {
    cargarDatos({ showLoading: firstLoadRef.current });
    firstLoadRef.current = false;
  }, [cargarDatos]);

  const hayStockBajo = (producto: Producto) => {
    return producto.stock_actual <= producto.stock_minimo;
  };

  const handleNuevoProducto = () => {
    setProductoEditando(null);
    setShowForm(true);
  };

  const handleEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);
    setShowForm(true);
  };

  const handleEliminarProducto = async () => {
    if (!productoEliminar) return;
    try {
      await productService.eliminarProducto(productoEliminar.id);
      await cargarDatos({ showLoading: true });
      setShowDeleteConfirm(false);
      setProductoEliminar(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al eliminar producto');
    }
  };

  const handleFormSuccess = () => {
    cargarDatos({ showLoading: true });
  };

  const renderSkeleton = () => (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <div className="skeleton-title"></div>
          <div className="skeleton-subtitle"></div>
        </div>
        <div className="module-toolbar">
          <div className="skeleton-search"></div>
          {esGerente && <div className="skeleton-btn"></div>}
        </div>
      </div>
      <div className="module-card">
        <div className="skeleton-table">
          <div className="skeleton-table-header">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="skeleton-table-header-cell"></div>
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-table-row">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => (
                <div key={j} className={`skeleton-table-cell ${j === 3 ? 'short' : ''}`}></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  return (
    <div className="module-page">
      <div className="module-page-header">
        <div>
          <h1 className="module-title">Catálogo de Productos</h1>
          <p className="module-subtitle">Administra los ítems disponibles para venta y compra.</p>
        </div>
        <div className="module-toolbar">
          <div className="module-search">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Buscar por código, nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {esGerente && (
            <button type="button" onClick={handleNuevoProducto} className="module-primary-btn">
              <i className="bx bx-plus" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="module-card">
        <table className="module-table">
          <thead>
            <tr>
              <th>Img</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th>Costo</th>
              <th>Precio</th>
              <th>Estado</th>
              {esGerente && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={esGerente ? 9 : 8} className="module-empty">
                  <i className='bx bx-package'></i>
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              productos.map((producto) => (
                <tr
                  key={producto.id}
                  id={`product-${producto.id}`}
                  className={hayStockBajo(producto) ? 'stock-bajo' : undefined}
                >
                  <td>
                    {producto.imageUrl ? (
                      <img src={producto.imageUrl} alt="" className="product-thumb" />
                    ) : (
                      <span className="product-thumb-placeholder">
                        <i className="bx bx-image-alt" />
                      </span>
                    )}
                  </td>
                  <td className="product-code">{producto.codigo}</td>
                  <td className="product-name">{producto.nombre}</td>
                  <td><span className="product-badge">{producto.categoria?.nombre}</span></td>
                  <td>{producto.unidad?.nombre}</td>
                  <td className="product-price">S/ {Number(producto.precio_compra).toFixed(2)}</td>
                  <td className="product-price">S/ {Number(producto.precio_venta).toFixed(2)}</td>
                  <td>
                    {hayStockBajo(producto) ? (
                      <span className="product-status warning">
                        <i className='bx bx-error'></i>
                        Stock Bajo
                      </span>
                    ) : (
                      <span className="product-status success">
                        <i className='bx bx-check-circle'></i>
                        Disponible
                      </span>
                    )}
                  </td>
                  {esGerente && (
                    <td>
                      <div className="product-actions">
                        <button
                          onClick={() => handleEditarProducto(producto)}
                          className="action-btn edit-btn"
                          title="Editar"
                          type="button"
                        >
                          <i className='bx bx-edit'></i>
                        </button>
                        <button
                          onClick={() => {
                            setProductoEliminar(producto);
                            setShowDeleteConfirm(true);
                          }}
                          className="action-btn delete-btn"
                          title="Eliminar"
                          type="button"
                        >
                          <i className='bx bx-trash-alt'></i>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPagina(pagina - 1)}
            disabled={pagina === 1}
            className="pagination-btn"
          >
            <i className='bx bx-chevron-left'></i>
          </button>
          <span className="pagination-info">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
            className="pagination-btn"
          >
            <i className='bx bx-chevron-right'></i>
          </button>
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setProductoEditando(null);
        }}
        title={productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
        size="medium"
      >
        <ProductForm
          key={productoEditando?.id ?? 'new'}
          producto={productoEditando}
          onClose={() => {
            setShowForm(false);
            setProductoEditando(null);
          }}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProductoEliminar(null);
        }}
        title="Confirmar Eliminación"
        size="small"
      >
        <div className="delete-confirm-content">
          <div className="delete-confirm-icon">
            <i className='bx bx-trash-alt'></i>
          </div>
          <p>¿Estás seguro de que deseas eliminar el producto <strong>{productoEliminar?.nombre}</strong>?</p>
          <p className="delete-confirm-hint">Esta acción no se puede deshacer.</p>
        </div>
        <div className="form-actions">
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setProductoEliminar(null);
            }}
            className="btn-cancel"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminarProducto}
            className="btn-delete"
          >
            <i className='bx bx-trash-alt'></i>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductList;
