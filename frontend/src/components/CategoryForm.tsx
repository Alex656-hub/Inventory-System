import React, { useState, useEffect } from 'react';
import './CategoryForm.css';

interface Category {
  id?: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
}

interface CategoryFormProps {
  category?: Category | null;
  onClose: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onClose }) => {
  const [formData, setFormData] = useState({
    nombre: ''
  });

  useEffect(() => {
    if (category) {
      setFormData({
        nombre: category.nombre
      });
    } else {
      setFormData({
        nombre: ''
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    console.log('Guardando categoría:', formData);
    onClose();
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
            placeholder="Ej: Bebidas, Limpieza, Electrónica..."
            className="mf-field"
            required
          />
        </div>
      </div>

      <div className="mf-actions category-form-actions">
        <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="mf-btn mf-btn--primary">
          {category ? 'Guardar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
