import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoryService } from '../services/category.service';
import { Categoria } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import CategoryForm from './CategoryForm';
import './CategoryList.css';

const CategoryList: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [activoFiltro, setActivoFiltro] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [showDesactivarConfirm, setShowDesactivarConfirm] = useState(false);
  const [categoriaDesactivar, setCategoriaDesactivar] = useState<Categoria | null>(null);
  const [showEliminarHardConfirm, setShowEliminarHardConfirm] = useState(false);
  const [categoriaEliminarHard, setCategoriaEliminarHard] = useState<Categoria | null>(null);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  // URL search params
  const [searchParams] = useSearchParams();
  const categoriaId = searchParams.get('categoriaId');

  // Ref for scrolling to focused category
  const categoriesContainerRef = useRef<HTMLDivElement>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      let activaParam: boolean | undefined;
      if (activoFiltro === 'active') activaParam = true;
      else if (activoFiltro === 'inactive') activaParam = false;
      // else 'all', undefined

      const response = await categoryService.obtenerCategorias(activaParam, busqueda);
      setCategorias(response.categorias);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarDatos();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [busqueda]);

  useEffect(() => {
    cargarDatos();
  }, [activoFiltro]);

  // Handle categoriaId parameter
  useEffect(() => {
    if (categoriaId && categorias.length > 0) {
      // Scroll to the focused category
      const categoryElement = document.getElementById(`category-${categoriaId}`);
      if (categoryElement) {
        categoryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        categoryElement.classList.add('highlighted');
        // Remove highlight after a few seconds
        setTimeout(() => {
          categoryElement.classList.remove('highlighted');
        }, 3000);
      }
    }
  }, [categoriaId, categorias]);

  const handleNuevo = () => {
    setCategoriaEditando(null);
    setShowForm(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setShowForm(true);
  };

  const handleDesactivar = async () => {
    if (!categoriaDesactivar) return;
    
    try {
      await categoryService.eliminarCategoria(categoriaDesactivar.id);
      cargarDatos();
      setShowDesactivarConfirm(false);
      setCategoriaDesactivar(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al desactivar categoría');
    }
  };

  const handleActivar = async (categoria: Categoria) => {
    try {
      await categoryService.actualizarCategoria(categoria.id, { activa: true });
      cargarDatos();
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al activar categoría');
    }
  };

  const handleEliminarHard = async () => {
    if (!categoriaEliminarHard) return;
    
    try {
      await categoryService.eliminarCategoriaHard(categoriaEliminarHard.id);
      cargarDatos();
      setShowEliminarHardConfirm(false);
      setCategoriaEliminarHard(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al eliminar categoría permanentemente');
    }
  };

  const handleFormSuccess = () => {
    cargarDatos();
  };

  return (
    <div className="category-list">
      <div className="page-header">
        <h1>Gestión de Categorías</h1>
        {esGerente && (
          <button onClick={handleNuevo} className="btn-primary">
            <i className='bx bx-plus'></i> Nueva Categoría
          </button>
        )}
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por ID, nombre, descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input"
        />
        <div className="select-wrapper">
          <select
            value={activoFiltro}
            onChange={(e) => setActivoFiltro(e.target.value as 'all' | 'active' | 'inactive')}
            className="filter-select"
          >
            <option value="all">Todas las categorías</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
          <i className="bx bx-chevron-down select-icon"></i>
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando categorías...</div>
      ) : (
        <div className="table-container">
          <table className="categories-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                {esGerente && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {categorias.length === 0 ? (
                <tr>
                  <td colSpan={esGerente ? 5 : 4} className="no-data">
                    No se encontraron categorías
                  </td>
                </tr>
              ) : (
                categorias.map((categoria) => (
                  <tr key={categoria.id} id={`category-${categoria.id}`}>
                    <td>{categoria.id}</td>
                    <td className="nombre-cell">{categoria.nombre}</td>
                    <td className="descripcion-cell">
                      {categoria.descripcion || <span className="no-description">Sin descripción</span>}
                    </td>
                    <td>
                      <span className={`badge ${categoria.activa ? 'success' : 'inactive'}`}>
                        {categoria.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    {esGerente && (
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleEditar(categoria)}
                            className="btn-icon btn-edit"
                            title="Editar categoría"
                          >
                            <i className='bx bx-edit'></i>
                          </button>
                          {categoria.activa ? (
                            <button 
                              onClick={() => {
                                setCategoriaDesactivar(categoria);
                                setShowDesactivarConfirm(true);
                              }}
                              className="btn-icon btn-delete"
                              title="Desactivar categoría"
                            >
                              <i className='bx bx-x'></i>
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setCategoriaEliminarHard(categoria);
                                setShowEliminarHardConfirm(true);
                              }}
                              className="btn-icon btn-hard-delete"
                              title="Eliminar permanentemente"
                            >
                              <i className='bx bx-trash-alt'></i>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setCategoriaEditando(null);
        }}
        title={categoriaEditando ? 'Editar Categoría' : 'Nueva Categoría'}
        size="medium"
      >
        <CategoryForm
          categoria={categoriaEditando}
          onClose={() => {
            setShowForm(false);
            setCategoriaEditando(null);
          }}
          onSuccess={handleFormSuccess}
          onDeactivate={() => {
            if (categoriaEditando?.activa) {
              // Desactivar categoría activa
              setShowForm(false);
              setCategoriaEditando(null);
              setCategoriaDesactivar(categoriaEditando);
              setShowDesactivarConfirm(true);
            } else {
              // Activar categoría inactiva
              handleActivar(categoriaEditando!);
              setShowForm(false);
              setCategoriaEditando(null);
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={showDesactivarConfirm}
        onClose={() => {
          setShowDesactivarConfirm(false);
          setCategoriaDesactivar(null);
        }}
        title="Confirmar Desactivación"
        size="small"
      >
        <p>
          ¿Estás seguro de que deseas desactivar la categoría <strong> {categoriaDesactivar?.nombre}</strong>?
        </p>
        <p className="warning-text">
          Esta acción marcará la categoría como inactiva pero no eliminará los productos asociados.
        </p>
        <div className="form-actions">
          <button onClick={() => {
            setShowDesactivarConfirm(false);
            setCategoriaDesactivar(null);
          }} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleDesactivar} className="btn-primary" style={{ backgroundColor: '#dc3545' }}>
            Desactivar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showEliminarHardConfirm}
        onClose={() => {
          setShowEliminarHardConfirm(false);
          setCategoriaEliminarHard(null);
        }}
        title="Confirmar Eliminación Permanente"
        size="small"
      >
        <p>
          ¿Estás seguro de que deseas eliminar permanentemente la categoría <strong>{categoriaEliminarHard?.nombre}</strong>?
        </p>
        <p className="warning-text">
          Esta acción no se puede deshacer. La categoría será eliminada completamente de la base de datos.
        </p>
        <div className="form-actions">
          <button onClick={() => {
            setShowEliminarHardConfirm(false);
            setCategoriaEliminarHard(null);
          }} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleEliminarHard} className="btn-primary" style={{ backgroundColor: '#dc3545' }}>
            Eliminar Permanentemente
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryList;
