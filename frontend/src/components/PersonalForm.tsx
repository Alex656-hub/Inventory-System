import React, { useState, useEffect } from 'react';
import './PersonalForm.css';

interface PersonalItem {
  id?: number;
  nombreCompleto: string;
  cargo: string;
  telefono: string;
  estado: boolean;
}

interface PersonalFormProps {
  item?: PersonalItem | null;
  onClose: () => void;
  onSave: (formData: Omit<PersonalItem, 'id'>) => void;
}

const PersonalForm: React.FC<PersonalFormProps> = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    cargo: '',
    telefono: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        nombreCompleto: item.nombreCompleto,
        cargo: item.cargo,
        telefono: item.telefono
      });
    } else {
      setFormData({
        nombreCompleto: '',
        cargo: '',
        telefono: ''
      });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombreCompleto.trim()) {
      alert('El nombre completo es obligatorio');
      return;
    }

    onSave({
      nombreCompleto: formData.nombreCompleto.trim(),
      cargo: formData.cargo,
      telefono: formData.telefono.trim(),
      estado: true
    });
  };

  return (
    <div className="personal-form-container">
      <form className="mf-form personal-form" onSubmit={handleSubmit}>
        <div className="mf-group">
          <label htmlFor="nombreCompleto">Nombre Completo *</label>
          <div className="mf-field-wrap">
            <input
              id="nombreCompleto"
              name="nombreCompleto"
              type="text"
              value={formData.nombreCompleto}
              onChange={handleChange}
              className="mf-field"
              required
            />
          </div>
        </div>

        <div className="personal-form-row">
          <div className="mf-group">
            <label htmlFor="cargo">Rol / Cargo</label>
            <div className="mf-field-wrap">
              <input
                id="cargo"
                name="cargo"
                type="text"
                value={formData.cargo}
                onChange={handleChange}
                placeholder="Ejm. Almacenero"
                className="mf-field"
              />
            </div>
          </div>
          <div className="mf-group">
            <label htmlFor="telefono">Teléfono</label>
            <div className="mf-field-wrap">
              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                className="mf-field"
              />
            </div>
          </div>
        </div>

        <div className="mf-actions personal-form-actions">
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="mf-btn mf-btn--primary">Guardar</button>
        </div>
      </form>
    </div>
  );
};

export default PersonalForm;
