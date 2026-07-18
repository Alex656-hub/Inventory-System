import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import CategoryForm from './CategoryForm';
import { categoryService } from '../services/category.service';
import { Categoria } from '../types';
import './CategoryList.css';
import '../styles/moduleBase.css';

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoryEditando, setCategoryEditando] = useState<Categoria | null>(null);
  const [showEliminarHardConfirm, setShowEliminarHardConfirm] = useState(false);
  const [categoryEliminarHard, setCategoryEliminarHard] = useState<Categoria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const esGerente = true; // Temporal, deberías usar useAuth

  const filteredCategories = categories.filter(category => 
    category.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await categoryService.obtenerCategorias();
      setCategories(response.categorias);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrear = () => {
    setCategoryEditando(null);
    setShowForm(true);
  };

  const handleEditar = (category: Categoria) => {
    setCategoryEditando(category);
    setShowForm(true);
  };

  const handleEliminarHard = (category: Categoria) => {
    setCategoryEliminarHard(category);
    setShowEliminarHardConfirm(true);
  };

  const confirmarEliminarHard = async () => {
    if (!categoryEliminarHard) return;

    try {
      await categoryService.eliminarCategoriaHard(categoryEliminarHard.id);
      setCategories(categories.filter(cat => cat.id !== categoryEliminarHard.id));
      setShowEliminarHardConfirm(false);
      setCategoryEliminarHard(null);
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setCategoryEditando(null);
    cargarDatos();
  };

  const toggleEstado = async (category: Categoria) => {
    try {
      await categoryService.actualizarCategoria(category.id, { activa: !category.activa });
      setCategories(categories.map(cat => 
        cat.id === category.id ? { ...cat, activa: !cat.activa } : cat
      ));
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  return (
    <div className="module-page unit-list-container">
      <div className="module-page-header unit-list-header">
        <div>
          <h1 className="module-title">Categorías</h1>
          <p className="module-subtitle subtitle">Agrupa tus productos para organizar el inventario.</p>
        </div>
        <div className="module-toolbar unit-list-actions">
          <div className="module-search unit-search">
            <i className='bx bx-search'></i>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {esGerente && (
            <button className="module-primary-btn new-user-btn" onClick={handleCrear}>
              <i className='bx bx-plus'></i>
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="module-card unit-table-container">
          <div className="module-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="module-skeleton-row" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="module-skeleton-cell module-skeleton-cell--icon"></div>
                <div className="module-skeleton-cell module-skeleton-cell--small"></div>
                <div className="module-skeleton-cell module-skeleton-cell--actions"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="module-card unit-table-container">
          <table className="module-table unit-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id} className={!category.activa ? 'inactive' : ''}>
                  <td className="unit-name">
                    <i className='bx bx-category unit-icon'></i>
                    {category.nombre}
                  </td>
                  <td className="unit-status">
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={category.activa}
                          onChange={() => toggleEstado(category)}
                          disabled={!esGerente}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className={`status-text ${category.activa ? 'active' : 'inactive'}`}>
                        {category.activa ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="unit-actions">
                    {esGerente && (
                      <>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditar(category)}
                          title="Editar"
                        >
                          <i className='bx bx-edit'></i>
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleEliminarHard(category)}
                          title="Eliminar permanentemente"
                        >
                          <i className='bx bx-trash'></i>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="no-data">
              <i className='bx bx-category' style={{ fontSize: '32px', color: 'var(--color-sky-200)', marginBottom: '8px' }}></i>
              <p>No se encontraron categorías</p>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar */}
      <Modal
        isOpen={showForm}
        onClose={handleFormClose}
        title={categoryEditando ? 'Editar Categoría' : 'Nueva Categoría'}
        size="xs"
      >
        <CategoryForm
          category={categoryEditando}
          onClose={handleFormClose}
        />
      </Modal>

      {/* Modal de confirmación para eliminar permanentemente */}
      <Modal
        isOpen={showEliminarHardConfirm}
        onClose={() => setShowEliminarHardConfirm(false)}
        title="Eliminar Categoría Permanentemente"
        size="xs"
      >
        <div className="confirm-modal">
          <p>
            ¿Estás seguro de que quieres eliminar permanentemente la categoría "{categoryEliminarHard?.nombre}"? Esta acción no se puede deshacer.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowEliminarHardConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-danger"
              onClick={confirmarEliminarHard}
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryList;
