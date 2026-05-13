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
    id: '',
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
        id: proveedor.id?.toString() || '',
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
    if (ruc.length !== 11) return false;
    const validPrefixes = ['10', '15', '16', '17', '20'];
    const prefix = ruc.substring(0, 2);
    return validPrefixes.includes(prefix) && /^\d+$/.test(ruc);
  };

  const validateDNI = (dni: string): boolean => {
    return /^\d{8}$/.test(dni);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^9\d{8}$/;
    return phoneRegex.test(phone);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres';
    }

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

    if (formData.contacto_telefono && !validatePhone(formData.contacto_telefono)) {
      newErrors.contacto_telefono = 'El teléfono debe tener 9 dígitos empezando con 9';
    }

    if (formData.contacto_email && !validateEmail(formData.contacto_email)) {
      newErrors.contacto_email = 'El email no tiene un formato válido';
    }

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
      const { id, ...data } = formData;
      const proveedorData: Partial<Proveedor> = data;

      if (proveedor) {
        await supplierService.actualizarProveedor(proveedor.id, proveedorData);
      } else {
        await supplierService.crearProveedor(proveedorData);
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

    if (name === 'ruc_dni' || name === 'contacto_telefono') {
      const numericValue = value.replace(/\D/g, '');
      
      if (name === 'contacto_telefono') {
        // Solo permitir números que empiecen con 9
        let permitido = '';
        if (numericValue.length === 0) {
          permitido = '';
        } else if (numericValue.startsWith('9')) {
          permitido = numericValue.slice(0, 9); // Máximo 9 dígitos
        }
        setFormData(prev => ({ ...prev, [name]: permitido }));
      } else {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const fieldClass = (name: string) =>
    `mf-field ${errors[name] ? 'error' : ''}`;

  return (
    <form onSubmit={handleSubmit} className="mf-form supplier-form">
      <div className="form-content">
        <div className="mf-group">
          <label htmlFor="nombre">Nombre / Razón Social *</label>
          <div className="mf-field-wrap">
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={fieldClass('nombre')}
              placeholder="Nombre o razón social"
              disabled={loading}
            />
          </div>
          {errors.nombre && <span className="mf-field-error">{errors.nombre}</span>}
        </div>

        <div className="supplier-form-row">
          <div className="supplier-form-col">
            <label className="supplier-form-row__label" htmlFor="ruc_dni">
              RUC / DNI
            </label>
            <div className="mf-group supplier-form-row__field">
              <div className="mf-field-wrap">
                <input
                  type="text"
                  id="ruc_dni"
                  name="ruc_dni"
                  value={formData.ruc_dni}
                  onChange={handleChange}
                  className={fieldClass('ruc_dni')}
                  placeholder=""
                  maxLength={11}
                  disabled={loading}
                />
              </div>
              {errors.ruc_dni && <span className="mf-field-error">{errors.ruc_dni}</span>}
            </div>
          </div>

          <div className="supplier-form-col">
            <label className="supplier-form-row__label" htmlFor="contacto_telefono">
              Teléfono
            </label>
            <div className="mf-group supplier-form-row__field telefono-field">
              <div className="mf-field-wrap">
                <input
                  type="tel"
                  id="contacto_telefono"
                  name="contacto_telefono"
                  value={formData.contacto_telefono}
                  onChange={handleChange}
                  className={fieldClass('contacto_telefono')}
                  placeholder=""
                  maxLength={9}
                  disabled={loading}
                />
              </div>
              {errors.contacto_telefono && (
                <span className="mf-field-error">{errors.contacto_telefono}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mf-group">
          <label htmlFor="contacto_email">Email</label>
          <div className="mf-field-wrap">
            <input
              type="email"
              id="contacto_email"
              name="contacto_email"
              value={formData.contacto_email}
              onChange={handleChange}
              className={fieldClass('contacto_email')}
              placeholder=""
              disabled={loading}
            />
          </div>
          {errors.contacto_email && <span className="mf-field-error">{errors.contacto_email}</span>}
        </div>
      </div>

      <div className="mf-actions supplier-form-actions">
        <button type="button" onClick={onClose} className="mf-btn mf-btn--ghost" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="mf-btn mf-btn--primary">
          Guardar
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;
