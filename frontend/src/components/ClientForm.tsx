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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre / razón social es obligatorio');
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
              className="mf-field"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="client-form-row">
          <div className="mf-group">
            <label htmlFor="documento">DNI / RUC</label>
            <div className="mf-input-with-icon">
              <i className="bx bx-file mf-input-with-icon__pin" aria-hidden />
              <div className="mf-field-wrap">
                <input
                  id="documento"
                  name="documento"
                  type="text"
                  value={formData.documento}
                  onChange={handleChange}
                  placeholder="Ej. 2013489182"
                  className="mf-field"
                />
              </div>
            </div>
          </div>
          <div className="mf-group">
            <label htmlFor="telefono">Teléfono</label>
            <div className="mf-input-with-icon">
              <i className="bx bx-phone mf-input-with-icon__pin" aria-hidden />
              <div className="mf-field-wrap">
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Ej. 987654321"
                  className="mf-field"
                />
              </div>
            </div>
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
              className="mf-field"
            />
          </div>
        </div>

        <div className="mf-actions client-form-actions">
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="mf-btn mf-btn--primary">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
