import React, { useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { Producto, Categoria } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import ProductForm from './ProductForm';
import './ProductList.css';

const ProductList: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | ''>('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const params: any = {
        pagina,
        limite: 10,
        activo: true
      };

      if (busqueda) {
        params.busqueda = busqueda;
      }

      if (categoriaFiltro) {
        params.categoria_id = categoriaFiltro;
      }

      const response = await productService.obtenerProductos(params);
      setProductos(response.productos);
      setTotalPaginas(response.paginacion.totalPaginas);

      const catsResponse = await categoryService.obtenerCategorias(true);
      setCategorias(catsResponse.categorias);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [pagina, categoriaFiltro]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pagina === 1) {
        cargarDatos();
      } else {
        setPagina(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [busqueda]);

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
      cargarDatos();
      setShowDeleteConfirm(false);
      setProductoEliminar(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al eliminar producto');
    }
  };

  const handleFormSuccess = () => {
    cargarDatos();
  };

  return (
    <div className="product-list">
      <div className="page-header">
        <h1>Gestión de Productos</h1>
        {esGerente && (
          <button onClick={handleNuevoProducto} className="btn-primary">
            <i className='bx bx-plus'></i> Nuevo Producto
          </button>
        )}
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por código, nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input"
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : '')}
          className="filter-select"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando productos...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="products-table">
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
                    <td colSpan={8} className="no-data">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  productos.map((producto) => (
                    <tr key={producto.id} className={hayStockBajo(producto) ? 'stock-bajo' : ''}>
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
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleEditarProducto(producto)}
                              className="btn-icon btn-edit"
                              title="Editar"
                            >
                              <i className='bx bx-edit'></i>
                            </button>
                            <button 
                              onClick={() => {
                                setProductoEliminar(producto);
                                setShowDeleteConfirm(true);
                              }}
                              className="btn-icon btn-delete"
                              title="Eliminar"
                            >
                              <i className='bx bx-trash'></i>
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
                className="btn-pagination"
              >
                Anterior
              </button>
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(pagina + 1)}
                disabled={pagina === totalPaginas}
                className="btn-pagination"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setProductoEditando(null);
        }}
        title={productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
        size="large"
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
          <button onClick={() => {
            setShowDeleteConfirm(false);
            setProductoEliminar(null);
          }} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleEliminarProducto} className="btn-primary" style={{ backgroundColor: '#dc3545' }}>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductList;

