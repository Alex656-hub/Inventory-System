import React, { useEffect, useState } from 'react';
import { categoryService } from '../services/category.service';
import { Categoria } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import CategoryForm from './CategoryForm';
import './CategoryList.css';

const CategoryList: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoriaEliminar, setCategoriaEliminar] = useState<Categoria | null>(null);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await categoryService.obtenerCategorias();
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

  const handleNuevo = () => {
    setCategoriaEditando(null);
    setShowForm(true);
  };

  const handleEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setShowForm(true);
  };

  const handleEliminar = async () => {
    if (!categoriaEliminar) return;
    
    try {
      await categoryService.eliminarCategoria(categoriaEliminar.id);
      cargarDatos();
      setShowDeleteConfirm(false);
      setCategoriaEliminar(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al eliminar categoría');
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
                  <tr key={categoria.id}>
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
                          <button 
                            onClick={() => {
                              setCategoriaEliminar(categoria);
                              setShowDeleteConfirm(true);
                            }}
                            className="btn-icon btn-delete"
                            title="Eliminar categoría"
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
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCategoriaEliminar(null);
        }}
        title="Confirmar Eliminación"
        size="small"
      >
        <p>
          ¿Estás seguro de que deseas eliminar la categoría <strong> {categoriaEliminar?.nombre}</strong>?
        </p>
        <p className="warning-text">
          Esta acción marcará la categoría como inactiva pero no eliminará los productos asociados.
        </p>
        <div className="form-actions">
          <button onClick={() => {
            setShowDeleteConfirm(false);
            setCategoriaEliminar(null);
          }} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleEliminar} className="btn-primary" style={{ backgroundColor: '#dc3545' }}>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryList;
