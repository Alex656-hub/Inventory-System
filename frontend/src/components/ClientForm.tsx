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
      <form className="client-form" onSubmit={handleSubmit}>
        <div className="client-form-group">
          <label htmlFor="nombre">Nombre / Razón Social *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={formData.nombre}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>

        <div className="client-form-row">
          <div className="client-form-group">
            <label htmlFor="documento">DNI / RUC</label>
            <div className="input-with-icon">
              <i className="bx bx-file input-icon" />
              <input
                id="documento"
                name="documento"
                type="text"
                value={formData.documento}
                onChange={handleChange}
                placeholder="Ej. 2013489182"
              />
            </div>
          </div>
          <div className="client-form-group">
            <label htmlFor="telefono">Teléfono</label>
            <div className="input-with-icon">
              <i className="bx bx-phone input-icon" />
              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej. 987654321"
              />
            </div>
          </div>
        </div>

        <div className="client-form-group">
          <label htmlFor="email">Email</label>
          <div className="input-with-icon">
            <i className="bx bx-envelope input-icon" />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>

        <div className="client-form-group">
          <label htmlFor="direccion">Dirección</label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            value={formData.direccion}
            onChange={handleChange}
          />
        </div>

        <div className="client-form-actions">
          <button type="button" className="client-cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="client-submit-btn">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;

