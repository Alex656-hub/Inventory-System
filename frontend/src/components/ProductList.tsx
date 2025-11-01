import React, { useEffect, useState } from 'react';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { Producto, Categoria } from '../types';
import './ProductList.css';

const ProductList: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | ''>('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

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

  return (
    <div className="product-list">
      <div className="page-header">
        <h1>Gestión de Productos</h1>
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
    </div>
  );
};

export default ProductList;

