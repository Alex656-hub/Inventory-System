// src/components/Ajustes.tsx - Página de Ajustes del Sistema

import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { ajustesService } from '../services/ajustes.service';
import './Ajustes.css';

const Ajustes: React.FC = () => {
  const { usuario } = authService.obtenerSesion();

  // Estados para los campos
  const [ruc, setRuc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoEmpresa, setLogoEmpresa] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Cargar configuración existente
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const config = await ajustesService.obtenerConfiguracion();
        setRuc(config.ruc || '');
        setDireccion(config.direccion || '');
        if (config.logo) {
          setPreviewImage(config.logo);
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
      } finally {
        setLoadingConfig(false);
      }
    };

    cargarConfiguracion();
  }, []);

  const handleRucChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números y limitar a 11 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 11);
    setRuc(numericValue);
  };

  const handleImportExcel = () => {
    alert('Función de importar Excel en desarrollo');
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('ruc', ruc);
      formData.append('direccion', direccion);
      
      if (logoEmpresa) {
        formData.append('logo', logoEmpresa);
      }

      const response = await ajustesService.guardarConfiguracion(formData);
      alert(response.mensaje);
      
      // Si se guardó un nuevo logo, actualizar el preview
      if (response.configuracion.logo) {
        setPreviewImage(response.configuracion.logo);
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen válido');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
        setLogoEmpresa(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await ajustesService.eliminarLogo();
      setLogoEmpresa(null);
      setPreviewImage(null);
      alert('Logo eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar logo:', error);
      alert('Error al eliminar el logo');
    }
  };

  const esGerente = usuario?.rol === 'gerente';

  if (loadingConfig) {
    return <div className="ajustes-container">Cargando configuración...</div>;
  }

  return (
    <div className="ajustes-container">
      {/* Header */}
      <div className="ajustes-header">
        <h1>Ajustes del Sistema</h1>
        <p>Configuración general y preferencias del sistema</p>
      </div>

      <div className="ajustes-content">

        {/* ── Fila superior: Logo (izq) + Información Fiscal (der) ── */}
        <div className="ajustes-top-row">

          {/* Bloque Logo */}
          <div className="settings-section">
            <h2>Logotipo</h2>
            <div className="logo-section-body">
              {/* Preview */}
              <div className="logo-preview">
                {previewImage ? (
                  <div className="preview-wrapper">
                    <img src={previewImage} alt="Logo de la empresa" className="logo-image" />
                    <button
                      type="button"
                      className="btn-remove-image"
                      onClick={handleRemoveImage}
                      title="Eliminar imagen"
                    >
                      <i className='bx bx-x'></i>
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <i className='bx bx-image'></i>
                    <span>Sin logo</span>
                  </div>
                )}
              </div>

              {/* Input file oculto + botón estilizado */}
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              <label htmlFor="logo" className="btn-upload-logo">
                <i className='bx bx-upload'></i>
                Subir Imagen
              </label>
            </div>
          </div>

          {/* Bloque Información Fiscal / Detalles Generales */}
          <div className="settings-section">
            <h2>Detalles Generales</h2>
            <div className="settings-form">
              <div className="mf-group">
                <label htmlFor="ruc">RUC</label>
                <div className="mf-field-wrap">
                  <input
                    type="text"
                    id="ruc"
                    value={ruc}
                    onChange={handleRucChange}
                    placeholder="Ingrese el RUC de la empresa (11 dígitos)"
                    className="mf-field"
                    maxLength={11}
                    pattern="[0-9]{11}"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="mf-group">
                <label htmlFor="direccion">Dirección</label>
                <div className="mf-field-wrap">
                  <input
                    type="text"
                    id="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ingrese la dirección de la empresa"
                    className="mf-field"
                  />
                </div>
              </div>

              <button 
                className="btn btn-primary btn-save" 
                onClick={handleSaveSettings}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Bloque inferior: Zona de Peligro/Datos (fondo blanco) ── */}
        <div className="danger-zone">
          <h2>
            <span>⚠️</span> Zona de Peligro / Datos
          </h2>
          <p className="danger-subtitle">Gestiona tus copias de seguridad y sesiones activas.</p>

          <div className="danger-actions">
            <button className="btn-backup" onClick={() => alert('Función de respaldo en desarrollo')}>
              <i className='bx bx-cloud-upload'></i>
              Crear Respaldo
            </button>

            {esGerente && (
              <button className="btn-restore" onClick={() => alert('Función de restauración en desarrollo')}>
                <i className='bx bx-cloud-download'></i>
                Restaurar
              </button>
            )}

            <button className="btn-warning" onClick={handleImportExcel}>
              <i className='bx bx-import'></i>
              Importar Excel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Ajustes;