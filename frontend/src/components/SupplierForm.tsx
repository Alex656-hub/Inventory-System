import React, { useState, useEffect } from 'react';
import { supplierService } from '../services/supplier.service';
import { Proveedor } from '../types';
import './SupplierForm.css';

interface SupplierFormProps {
  proveedor?: Proveedor | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ proveedor, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    ruc_dni: '',
    contacto_telefono: '',
    contacto_email: '',
    direccion: '',
    condiciones_pago: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (proveedor) {
      setFormData({
        nombre: proveedor.nombre || '',
        ruc_dni: proveedor.ruc_dni || '',
        contacto_telefono: proveedor.contacto_telefono || '',
        contacto_email: proveedor.contacto_email || '',
        direccion: proveedor.direccion || '',
        condiciones_pago: proveedor.condiciones_pago || ''
      });
    }
  }, [proveedor]);

  const validateRUC = (ruc: string): boolean => {
    // RUC peruano: 11 dígitos, prefijos válidos
    // 10: persona natural, 15/16/17: extranjeros, 20: persona jurídica
    if (ruc.length !== 11) return false;
    const validPrefixes = ['10', '15', '16', '17', '20'];
    const prefix = ruc.substring(0, 2);
    return validPrefixes.includes(prefix) && /^\d+$/.test(ruc);
  };

  const validateDNI = (dni: string): boolean => {
    // DNI peruano: exactamente 8 dígitos
    return /^\d{8}$/.test(dni);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Validación básica de teléfono peruano (9 dígitos empezando con 9)
    const phoneRegex = /^9\d{8}$/;
    return phoneRegex.test(phone);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validación nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    // Validación RUC/DNI
    if (!formData.ruc_dni.trim()) {
      newErrors.ruc_dni = 'El RUC/DNI es requerido';
    } else {
      const rucDni = formData.ruc_dni.trim();
      if (rucDni.length === 11) {
        if (!validateRUC(rucDni)) {
          newErrors.ruc_dni = 'RUC inválido. Debe tener 11 dígitos y empezar con 10, 15, 16, 17 o 20.';
        }
      } else if (rucDni.length === 8) {
        if (!validateDNI(rucDni)) {
          newErrors.ruc_dni = 'El DNI debe tener exactamente 8 dígitos.';
        }
      } else {
        newErrors.ruc_dni = 'El RUC debe tener 11 dígitos o el DNI 8 dígitos.';
      }
    }

    // Validación teléfono (opcional pero si se ingresa debe ser válido)
    if (formData.contacto_telefono && !validatePhone(formData.contacto_telefono)) {
      newErrors.contacto_telefono = 'El teléfono debe tener 9 dígitos empezando con 9';
    }

    // Validación email (opcional pero si se ingresa debe ser válido)
    if (formData.contacto_email && !validateEmail(formData.contacto_email)) {
      newErrors.contacto_email = 'El email no tiene un formato válido';
    }

    // Validaciones de longitud para campos opcionales
    if (formData.direccion && formData.direccion.length > 200) {
      newErrors.direccion = 'La dirección no puede exceder 200 caracteres';
    }

    if (formData.condiciones_pago && formData.condiciones_pago.length > 500) {
      newErrors.condiciones_pago = 'Las condiciones de pago no pueden exceder 500 caracteres';
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
      if (proveedor) {
        await supplierService.actualizarProveedor(proveedor.id, formData);
      } else {
        await supplierService.crearProveedor(formData);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const mensaje = error.response?.data?.mensaje || 'Error al guardar el proveedor';
      alert(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Para RUC/DNI y teléfono, solo permitir números
    if (name === 'ruc_dni' || name === 'contacto_telefono') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="supplier-form">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="nombre">Nombre *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={errors.nombre ? 'error' : ''}
            placeholder="Ej: Distribuidora del Norte S.A."
            disabled={loading}
          />
          {errors.nombre && <span className="error-message">{errors.nombre}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="ruc_dni">RUC/DNI *</label>
          <input
            type="text"
            id="ruc_dni"
            name="ruc_dni"
            value={formData.ruc_dni}
            onChange={handleChange}
            className={errors.ruc_dni ? 'error' : ''}
            placeholder="Ej: 20123456789 (RUC), 10123456789 (RUC PN), 12345678 (DNI)"
            maxLength={11}
            disabled={loading}
          />
          {errors.ruc_dni && <span className="error-message">{errors.ruc_dni}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contacto_telefono">Teléfono de Contacto</label>
          <input
            type="tel"
            id="contacto_telefono"
            name="contacto_telefono"
            value={formData.contacto_telefono}
            onChange={handleChange}
            className={errors.contacto_telefono ? 'error' : ''}
            placeholder="Ej: 987654321"
            maxLength={9}
            disabled={loading}
          />
          {errors.contacto_telefono && <span className="error-message">{errors.contacto_telefono}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contacto_email">Email de Contacto</label>
          <input
            type="email"
            id="contacto_email"
            name="contacto_email"
            value={formData.contacto_email}
            onChange={handleChange}
            className={errors.contacto_email ? 'error' : ''}
            placeholder="Ej: contacto@proveedor.com"
            disabled={loading}
          />
          {errors.contacto_email && <span className="error-message">{errors.contacto_email}</span>}
        </div>

        <div className="form-group full-width">
          <label htmlFor="direccion">Dirección</label>
          <input
            type="text"
            id="direccion"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            className={errors.direccion ? 'error' : ''}
            placeholder="Ej: Av. Principal 123, Bagua"
            disabled={loading}
          />
          {errors.direccion && <span className="error-message">{errors.direccion}</span>}
        </div>

        <div className="form-group full-width">
          <label htmlFor="condiciones_pago">Condiciones de Pago</label>
          <textarea
            id="condiciones_pago"
            name="condiciones_pago"
            value={formData.condiciones_pago}
            onChange={handleChange}
            rows={3}
            placeholder="Ej: Pago a 30 días, 50% anticipo, etc."
            disabled={loading}
          />
          {errors.condiciones_pago && <span className="error-message">{errors.condiciones_pago}</span>}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Guardando...' : proveedor ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;
