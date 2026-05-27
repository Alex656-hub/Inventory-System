import React, { useState, useEffect } from 'react';
import { unidadmedidaService } from '../services/unidadmedida.service';
import { UnidadMedida } from '../types';
import './UnitForm.css';

interface UnitFormProps {
  unidad?: UnidadMedida | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const UnitForm: React.FC<UnitFormProps> = ({ unidad, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    abreviatura: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (unidad) {
      setFormData({
        nombre: unidad.nombre || '',
        abreviatura: unidad.abreviatura || ''
      });
    }
  }, [unidad]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    if (!formData.abreviatura.trim()) {
      newErrors.abreviatura = 'La abreviatura es requerida';
    } else if (formData.abreviatura.trim().length < 1) {
      newErrors.abreviatura = 'La abreviatura debe tener al menos 1 carácter';
    } else if (formData.abreviatura.trim().length > 10) {
      newErrors.abreviatura = 'La abreviatura no puede exceder 10 caracteres';
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
      if (unidad) {
        await unidadmedidaService.actualizarUnidad(unidad.id, {
          nombre: formData.nombre.trim(),
          abreviatura: formData.abreviatura.trim()
        });
      } else {
        await unidadmedidaService.crearUnidad({
          nombre: formData.nombre.trim(),
          abreviatura: formData.abreviatura.trim()
        });
      }
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error al guardar unidad:', error);
      if (error.response?.data?.mensaje) {
        setErrors({ general: error.response.data.mensaje });
      } else {
        setErrors({ general: 'Error al guardar la unidad de medida' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="unit-form-container">
      <form onSubmit={handleSubmit} className="mf-form unit-form">
        {errors.general && (
          <div className="unit-general-error">
            {errors.general}
          </div>
        )}

        <div className="mf-group">
          <label htmlFor="nombre">Nombre *</label>
          <div className="mf-field-wrap">
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Unidad, Caja, Juego"
              className={`mf-field ${errors.nombre ? 'error' : ''}`}
              disabled={loading}
            />
          </div>
          {errors.nombre && (
            <span className="mf-field-error">{errors.nombre}</span>
          )}
        </div>

        <div className="mf-group">
          <label htmlFor="abreviatura">Abreviatura *</label>
          <div className="mf-field-wrap">
            <input
              type="text"
              id="abreviatura"
              name="abreviatura"
              value={formData.abreviatura}
              onChange={handleChange}
              placeholder="Ej: Und, Cja, Jgo"
              className={`mf-field ${errors.abreviatura ? 'error' : ''}`}
              disabled={loading}
              maxLength={10}
            />
          </div>
          {errors.abreviatura && (
            <span className="mf-field-error">{errors.abreviatura}</span>
          )}
        </div>

        <div className="mf-actions unit-form-actions">
          <button
            type="button"
            className="mf-btn mf-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="mf-btn mf-btn--primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : (unidad ? 'Actualizar' : 'Guardar')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UnitForm;
