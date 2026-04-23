import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/product.service';
import { Producto } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import ProductForm from './ProductForm';
import '../styles/moduleBase.css';

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

      {loading ? (
        <div className="module-loading">Cargando productos...</div>
      ) : (
        <>
          <div className="module-card">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Precio Compra</th>
                  <th>Precio Venta</th>
                  <th>Estado</th>
                  {esGerente && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan={esGerente ? 9 : 8} className="module-empty">
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
                      <td>{producto.codigo}</td>
                      <td>{producto.nombre}</td>
                      <td>{producto.categoria?.nombre}</td>
                      <td>{producto.stock_actual}</td>
                      <td>{producto.stock_minimo}</td>
                      <td>S/ {Number(producto.precio_compra).toFixed(2)}</td>
                      <td>S/ {Number(producto.precio_venta).toFixed(2)}</td>
                      <td>
                        {hayStockBajo(producto) ? (
                          <span className="badge warning">⚠️ Stock Bajo</span>
                        ) : (
                          <span className="badge success">✓ Disponible</span>
                        )}
                      </td>
                      {esGerente && (
                        <td>
                          <div className="actions">
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
        </>
      )}

      {/* Modal formulario — size="medium" para layout compacto */}
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
          producto={productoEditando}
          onClose={() => {
            setShowForm(false);
            setProductoEditando(null);
          }}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* Modal confirmación eliminar */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProductoEliminar(null);
        }}
        title="Confirmar Eliminación"
        size="small"
      >
        <p>¿Estás seguro de que deseas eliminar el producto <strong>{productoEliminar?.nombre}</strong>?</p>
        <div className="form-actions">
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setProductoEliminar(null);
            }}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminarProducto}
            className="btn-primary"
            style={{ backgroundColor: '#dc3545' }}
          >
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductList;