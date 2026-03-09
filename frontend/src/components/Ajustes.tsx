// src/components/Ajustes.tsx - Página de Ajustes del Sistema

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './Layout.css';

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
    // Lógica para importar Excel
    alert('Función de importar Excel en desarrollo');
  };

  const handleSaveSettings = () => {
    // Lógica para guardar configuración
    console.log('Guardando configuración:', { ruc, direccion, logoEmpresa });
    alert('Configuración guardada exitosamente');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }

      // Crear preview
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
      <div className="ajustes-header">
        <h1>Ajustes del Sistema</h1>
        <p>Configuración general y preferencias del sistema</p>
      </div>

      <div className="ajustes-content">
        {/* Logo de la Empresa */}
        <div className="settings-section">
          <h2>Logo de la Empresa</h2>
          <div className="settings-form">
            <div className="form-group">
              <div className="logo-upload-container">
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
                <div className="upload-controls">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                  />
                  <label htmlFor="logo" className="btn btn-secondary">
                    <i className='bx bx-upload'></i>
                    Subir Logo
                  </label>
                  <small className="upload-help">
                    Formatos: JPG, PNG, GIF. Máximo 5MB
                  </small>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSaveSettings}>
              Guardar Logo
            </button>
          </div>
        </div>

        {/* Información Fiscal */}
        <div className="settings-section">
          <h2>Información Fiscal</h2>
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

            <button className="btn btn-primary" onClick={handleSaveSettings}>
              Guardar Información Fiscal
            </button>
          </div>
        </div>

        {/* Zona de Peligro/Datos */}
        <div className="settings-section danger-zone">
          <h2>Zona de Peligro/Datos</h2>
          <p className="danger-description">
            Estas acciones son irreversibles y pueden afectar gravemente el funcionamiento del sistema.
          </p>
          
          <div className="danger-actions">
            <button className="btn btn-danger" onClick={handleLogout}>
              Cerrar Sesión Actual
            </button>
            
            {esGerente && (
              <button className="btn btn-danger" onClick={handleLogoutAll}>
                Cerrar Todas las Sesiones
              </button>
            )}
            
            <button className="btn btn-warning" onClick={handleImportExcel}>
              Importar Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ajustes;
