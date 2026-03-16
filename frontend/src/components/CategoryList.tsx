import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import CategoryForm from './CategoryForm';
import './CategoryList.css';

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoryEditando, setCategoryEditando] = useState<Category | null>(null);
  const [showEliminarHardConfirm, setShowEliminarHardConfirm] = useState(false);
  const [categoryEliminarHard, setCategoryEliminarHard] = useState<Category | null>(null);
  const esGerente = true; // Temporal, deberías usar useAuth

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Simulación de datos - reemplazar con servicio real
      const mockCategories: Category[] = [
        { id: 1, nombre: 'Electrónica', estado: true },
        { id: 2, nombre: 'Limpieza', estado: true },
        { id: 3, nombre: 'Materiales', estado: true }
      ];
      setCategories(mockCategories);
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

  const handleEditar = (category: Category) => {
    setCategoryEditando(category);
    setShowForm(true);
  };

  const handleEliminarHard = (category: Category) => {
    setCategoryEliminarHard(category);
    setShowEliminarHardConfirm(true);
  };

  const confirmarEliminarHard = async () => {
    if (!categoryEliminarHard) return;

    try {
      // await categoryService.eliminarCategoryHard(categoryEliminarHard.id);
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

  const toggleEstado = async (category: Category) => {
    try {
      // if (category.estado) {
      //   await categoryService.desactivarCategory(category.id);
      // } else {
      //   await categoryService.activarCategory(category.id);
      // }
      setCategories(categories.map(cat => 
        cat.id === category.id ? { ...cat, estado: !cat.estado } : cat
      ));
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  return (
    <div className="unit-list-container">
      <div className="unit-list-header">
        <div>
          <h1>Categorías</h1>
          <p className="subtitle">Agrupa tus productos para organizar el inventario.</p>
        </div>
        {esGerente && (
          <button className="new-user-btn" onClick={handleCrear}>
            <i className='bx bx-plus'></i>
            Nueva Categoría
          </button>
        )}
      </div>

      <div className="unit-table-container">
        <table className="unit-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className={!category.estado ? 'inactive' : ''}>
                <td className="unit-name">
                  <i className='bx bx-category unit-icon'></i>
                  {category.nombre}
                </td>
                <td className="unit-status">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={category.estado}
                      onChange={() => toggleEstado(category)}
                      disabled={!esGerente}
                    />
                    <span className="slider"></span>
                  </label>
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
            <p>No se encontraron categorías</p>
          </div>
        )}
      </div>

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
