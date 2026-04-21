import React, { useState, useEffect } from 'react';
import { Sede, SedeRequest } from '../services/sede.service';

interface SedesYAlmacenesFormProps {
  sede?: Sede | null;
  onSave: (sede: SedeRequest) => Promise<void>;
  onCancel: () => void;
}

const SedesYAlmacenesForm: React.FC<SedesYAlmacenesFormProps> = ({
  sede,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<SedeRequest>({
    nombre: '',
    tipo: 'almacen',
    direccion: ''
  });
  const [errors, setErrors] = useState<Partial<SedeRequest>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sede) {
      setFormData({
        nombre: sede.nombre,
        tipo: sede.tipo,
        direccion: sede.direccion
      });
    }
  }, [sede]);

  const validateForm = (): boolean => {
    const newErrors: Partial<SedeRequest> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre de la sede es requerido';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida';
    } else if (formData.direccion.trim().length < 5) {
      newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error al guardar sede:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof SedeRequest]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <form className="mf-form" onSubmit={handleSubmit}>
      <div className="mf-group">
        <label htmlFor="nombre">
          Nombre del Local <span className="mf-required">*</span>
        </label>
        <div className="mf-field-wrap">
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            placeholder="Ej: Tienda Centro, Almacén Norte"
            className={`mf-field ${errors.nombre ? 'error' : ''}`}
            disabled={loading}
            autoComplete="off"
          />
        </div>
        {errors.nombre && <span className="mf-field-error">{errors.nombre}</span>}
      </div>

      <div className="mf-group">
        <label htmlFor="tipo">Tipo de Sede</label>
        <div className="mf-field-wrap">
          <select
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleInputChange}
            className={`mf-select ${errors.tipo ? 'error' : ''}`}
            disabled={loading}
          >
            <option value="almacen">Almacén</option>
            <option value="tienda">Tienda (Punto de Venta)</option>
          </select>
        </div>
        {errors.tipo && <span className="mf-field-error">{errors.tipo}</span>}
      </div>

      <div className="mf-group">
        <label htmlFor="direccion">
          Dirección Física <span className="mf-required">*</span>
        </label>
        <div className="mf-input-with-icon">
          <i className="bx bx-map mf-input-with-icon__pin" aria-hidden />
          <div className="mf-field-wrap">
            <input
              type="text"
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Ej: Av. Principal 123"
              className={`mf-field ${errors.direccion ? 'error' : ''}`}
              disabled={loading}
              autoComplete="street-address"
            />
          </div>
        </div>
        {errors.direccion && <span className="mf-field-error">{errors.direccion}</span>}
      </div>

      <div className="mf-actions">
        <button
          type="button"
          onClick={onCancel}
          className="mf-btn mf-btn--ghost"
          disabled={loading}
        >
          Cancelar
        </button>
        <button type="submit" className="mf-btn mf-btn--primary" disabled={loading}>
          {loading ? (
            <>
              <i className="bx bx-loader-alt mf-spinning" />
              Guardando...
            </>
          ) : (
            'Guardar'
          )}
        </button>
      </div>
    </form>
  );
};

export default SedesYAlmacenesForm;
