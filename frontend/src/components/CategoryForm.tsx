import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/category.service';
import { Categoria } from '../types';
import './CategoryForm.css';

interface CategoryFormProps {
  category?: Categoria | null;
  onClose: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onClose }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activa: true
  });

  useEffect(() => {
    if (category) {
      setFormData({
        nombre: category.nombre,
        descripcion: category.descripcion || '',
        activa: category.activa
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        activa: true
      });
    }
  }, [category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      if (category && category.id) {
        // Editar categoría existente
        await categoryService.actualizarCategoria(category.id, formData);
      } else {
        // Crear nueva categoría
        await categoryService.crearCategoria(formData);
      }
      onClose();
    } catch (error: any) {
      console.error('Error al guardar categoría:', error);
      alert(error.response?.data?.mensaje || 'Error al guardar categoría');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mf-form category-unit-form">
      <div className="mf-group">
        <label htmlFor="nombre">
          Nombre de la Categoría
          <span className="mf-required"> *</span>
        </label>
        <div className="mf-field-wrap">
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej: Oficina, Hogar"
            className="mf-field"
            required
          />
        </div>
      </div>

      <div className="mf-group">
        <label htmlFor="descripcion">
          Descripción
        </label>
        <div className="mf-field-wrap">
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="(Opcional)"
            className="mf-textarea"
            rows={3}
          />
        </div>
      </div>

      <div className="mf-actions category-form-actions">
        <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="mf-btn mf-btn--primary">
          {category ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
