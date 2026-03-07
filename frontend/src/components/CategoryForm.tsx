import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/category.service';
import { Categoria } from '../types';
import './CategoryForm.css';

interface CategoryFormProps {
  categoria?: Categoria | null;
  onClose: () => void;
  onSuccess: () => void;
  onDeactivate?: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ categoria, onClose, onSuccess, onDeactivate }) => {
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (categoria) {
      setFormData({
        id: categoria.id?.toString() || '',
        nombre: categoria.nombre || '',
        descripcion: categoria.descripcion || ''
      });
    }
  }, [categoria]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres';
    }
    if (formData.descripcion && formData.descripcion.length > 500) {
      newErrors.descripcion = 'La descripción no puede exceder 500 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const { id, ...data } = formData;
      const categoriaData: Partial<Categoria> = data;

      if (categoria) {
        await categoryService.actualizarCategoria(categoria.id, categoriaData);
      } else {
        await categoryService.crearCategoria(categoriaData);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const mensaje = error.response?.data?.mensaje || 'Error al guardar la categoría';
      alert(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="category-form">
      <div className="form-group">
        <label htmlFor="id">ID (Auto-generado)</label>
        <input
          type="text"
          id="id"
          name="id"
          value={formData.id}
          onChange={handleChange}
          className={errors.id ? 'error' : ''}
          placeholder="Se generará automáticamente"
          disabled={true}
        />
        {errors.id && <span className="error-message">{errors.id}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="nombre">Nombre *</label>
        <input
          type="text"
          id="nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          className={errors.nombre ? 'error' : ''}
          placeholder="Ej: Electrónicos, Hogar, Oficina..."
          disabled={loading}
        />
        {errors.nombre && <span className="error-message">{errors.nombre}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows={4}
          placeholder="Describe brevemente esta categoría (opcional)"
          disabled={loading}
        />
        {errors.descripcion && <span className="error-message">{errors.descripcion}</span>}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Guardando...' : categoria ? 'Actualizar' : 'Crear'}
        </button>
        {categoria && onDeactivate && (
          <button 
            type="button" 
            onClick={onDeactivate} 
            className={categoria.activa ? "btn-danger" : "btn-success"} 
            disabled={loading}
          >
            {categoria.activa ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </div>
    </form>
  );
};

export default CategoryForm;
