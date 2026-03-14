// src/components/Ajustes.tsx - Página de Ajustes del Sistema

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './Ajustes.css';

interface AjustesProps {}

const Ajustes: React.FC<AjustesProps> = () => {
  const navigate = useNavigate();
  const { usuario } = authService.obtenerSesion();

  // Estados para los campos
  const [ruc, setRuc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoEmpresa, setLogoEmpresa] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Funciones de manejo
  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar todas las sesiones en todos los dispositivos?')) {
      await authService.logoutAll();
      navigate('/login');
    }
  };

  const handleImportExcel = () => {
    alert('Función de importar Excel en desarrollo');
  };

  const handleSaveSettings = () => {
    console.log('Guardando configuración:', { ruc, direccion, logoEmpresa });
    alert('Configuración guardada exitosamente');
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

  const handleRemoveImage = () => {
    setLogoEmpresa(null);
    setPreviewImage(null);
  };

  const esGerente = usuario?.rol === 'gerente';

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
              <div className="form-group">
                <label htmlFor="ruc">RUC</label>
                <input
                  type="text"
                  id="ruc"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="Ingrese el RUC de la empresa"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="direccion">Dirección</label>
                <input
                  type="text"
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ingrese la dirección de la empresa"
                  className="form-input"
                />
              </div>

              <button className="btn btn-primary btn-save" onClick={handleSaveSettings}>
                Guardar Cambios
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
            <button className="btn-backup" onClick={handleLogout}>
              <i className='bx bx-cloud-upload'></i>
              Crear Respaldo
            </button>

            {esGerente && (
              <button className="btn-restore" onClick={handleLogoutAll}>
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