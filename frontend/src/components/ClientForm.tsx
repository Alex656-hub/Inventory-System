import React, { useEffect, useState } from 'react';
import './ClientForm.css';

export interface Cliente {
  id: number;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado: boolean;
}

interface ClientFormProps {
  cliente?: Cliente | null;
  onClose: () => void;
  onSave: (data: Omit<Cliente, 'id'>) => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ cliente, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre ?? '',
        documento: cliente.documento ?? '',
        telefono: cliente.telefono ?? '',
        email: cliente.email ?? '',
        direccion: cliente.direccion ?? '',
      });
    } else {
      setFormData({ nombre: '', documento: '', telefono: '', email: '', direccion: '' });
    }
  }, [cliente]);

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^9\d{8}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'telefono') {
      const numericValue = value.replace(/\D/g, '');
      let permitido = '';
      if (numericValue.length === 0) {
        permitido = '';
      } else if (numericValue.startsWith('9')) {
        permitido = numericValue.slice(0, 9);
      }
      setFormData(prev => ({ ...prev, [name]: permitido }));
    } else if (name === 'documento') {
      const numericValue = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre / razón social es obligatorio';
    }

    if (!formData.documento.trim()) {
      newErrors.documento = 'El DNI / RUC es obligatorio';
    } else {
      const docLen = formData.documento.trim().length;
      if (docLen !== 8 && docLen !== 11) {
        newErrors.documento = 'El DNI debe tener 8 dígitos o el RUC 11 dígitos';
      }
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    } else if (!validatePhone(formData.telefono)) {
      newErrors.telefono = 'El teléfono debe tener 9 dígitos empezando con 9';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      nombre: formData.nombre.trim(),
      documento: formData.documento.trim(),
      telefono: formData.telefono.trim() || undefined,
      email: formData.email.trim() || undefined,
      direccion: formData.direccion.trim() || undefined,
      estado: true,
    });
  };

  return (
    <div className="client-form-container">
      <form className="mf-form client-form" onSubmit={handleSubmit}>
        <div className="mf-group">
          <label htmlFor="nombre">Nombre / Razón Social *</label>
          <div className="mf-field-wrap">
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              className="mf-field"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="client-form-row">
          <div className="mf-group">
            <label htmlFor="documento">DNI / RUC *</label>
            <div className="mf-input-with-icon">
              <i className="bx bx-file mf-input-with-icon__pin" aria-hidden />
              <div className="mf-field-wrap">
                <input
                  id="documento"
                  name="documento"
                  type="text"
                  value={formData.documento}
                  onChange={handleChange}
                  placeholder="Ej: xxxxxxxx (DNI) / xxxxxxxxxxx (RUC)"
                  className={`mf-field ${errors.documento ? 'error' : ''}`}
                  required
                  maxLength={11}
                />
              </div>
            </div>
            {errors.documento && <span className="mf-field-error">{errors.documento}</span>}
          </div>
          <div className="mf-group">
            <label htmlFor="telefono">Teléfono *</label>
            <div className="mf-input-with-icon">
              <i className="bx bx-phone mf-input-with-icon__pin" aria-hidden />
              <div className="mf-field-wrap">
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Ej: 9xx xxx xxx"
                  className={`mf-field ${errors.telefono ? 'error' : ''}`}
                  required
                  maxLength={9}
                />
              </div>
            </div>
            {errors.telefono && <span className="mf-field-error">{errors.telefono}</span>}
          </div>
        </div>

        <div className="mf-group">
          <label htmlFor="email">Email</label>
          <div className="mf-input-with-icon">
            <i className="bx bx-envelope mf-input-with-icon__pin" aria-hidden />
            <div className="mf-field-wrap">
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className="mf-field"
              />
            </div>
          </div>
        </div>

        <div className="mf-group">
          <label htmlFor="direccion">Dirección</label>
          <div className="mf-field-wrap">
            <input
              id="direccion"
              name="direccion"
              type="text"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ej: Av. Los Olivos 123"
              className="mf-field"
            />
          </div>
        </div>

        <div className="mf-actions client-form-actions">
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="mf-btn mf-btn--primary">
            {cliente ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
