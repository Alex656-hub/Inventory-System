import React, { useState, useEffect } from 'react';
import { PersonalItem } from '../services/personal.service';
import './PersonalForm.css';

interface PersonalFormProps {
  item?: PersonalItem | null;
  onClose: () => void;
  onSave: (formData: Omit<PersonalItem, 'id'>) => void;
}

const PersonalForm: React.FC<PersonalFormProps> = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    cargo: 'Almacenero' as 'Almacenero' | 'Repartidor',
    telefono: '',
    activo: true
  });
  
  useEffect(() => {
    if (item) {
      setFormData({
        nombreCompleto: item.nombreCompleto,
        cargo: item.cargo,
        telefono: item.telefono || '',
        activo: item.activo
      });
    } else {
      setFormData({
        nombreCompleto: '',
        cargo: 'Almacenero' as 'Almacenero' | 'Repartidor',
        telefono: '',
        activo: true
      });
    }
  }, [item]);

  const formatearTelefono = (telefono: string): string => {
    // Remover todos los caracteres no numéricos
    const soloNumeros = telefono.replace(/\D/g, '');
    
    // Formatear cada 3 dígitos: 987654321 -> 987 654 321
    if (soloNumeros.length <= 3) return soloNumeros;
    if (soloNumeros.length <= 6) return soloNumeros.slice(0, 3) + ' ' + soloNumeros.slice(3);
    return soloNumeros.slice(0, 3) + ' ' + soloNumeros.slice(3, 6) + ' ' + soloNumeros.slice(6);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Si es el campo teléfono, solo permitir números que empiecen con 9
    if (name === 'telefono') {
      const soloNumeros = value.replace(/\D/g, '');
      
      // Solo permitir si empieza con 9 o está vacío
      let permitido = '';
      if (soloNumeros.length === 0) {
        permitido = '';
      } else if (soloNumeros.startsWith('9')) {
        permitido = soloNumeros.slice(0, 9); // Máximo 9 dígitos
      }
      
      const formateado = formatearTelefono(permitido);
      
      setFormData(prev => ({
        ...prev,
        [name]: formateado
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombreCompleto.trim()) {
      alert('El nombre completo es obligatorio');
      return;
    }

    // Limpiar formato del teléfono para guardar (quitar espacios)
    const telefonoLimpio = formData.telefono.replace(/\s/g, '');

    onSave({
      nombreCompleto: formData.nombreCompleto.trim(),
      cargo: formData.cargo,
      telefono: telefonoLimpio, // Guardar sin formato
      activo: formData.activo
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
              placeholder="Ej: Juan Pérez"
              className="mf-field"
              required
            />
          </div>
        </div>

        <div className="personal-form-row">
          <div className="mf-group">
            <label htmlFor="cargo">Rol / Cargo</label>
            <div className="mf-field-wrap">
              <select
                id="cargo"
                name="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value as 'Almacenero' | 'Repartidor' }))}
                className="mf-field"
              >
                <option value="Almacenero">Almacenero</option>
                <option value="Repartidor">Repartidor</option>
              </select>
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
                placeholder="Ej: 9xx xxx xxx"
              />
            </div>
          </div>
        </div>

        <div className="mf-actions personal-form-actions">
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="mf-btn mf-btn--primary">{item ? 'Actualizar' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
};

export default PersonalForm;
