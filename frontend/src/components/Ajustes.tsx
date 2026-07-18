// src/components/Ajustes.tsx - Página de Ajustes del Sistema

import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/auth.service';
import { ajustesService } from '../services/ajustes.service';
import { backupService } from '../services/backup.service';
import { importService, ImportResult } from '../services/import.service';
import './Ajustes.css';

const Ajustes: React.FC = () => {
  const { usuario } = authService.obtenerSesion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para los campos
  const [ruc, setRuc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoEmpresa, setLogoEmpresa] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Estados para modal de importación
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
    setShowImportModal(true);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && ['.xlsx', '.xls'].some(ext => f.name.toLowerCase().endsWith(ext))) {
      setImportFile(f);
      setImportResult(null);
      setImportError(null);
    } else {
      setImportFile(null);
      setImportError('Solo archivos Excel (.xlsx, .xls)');
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await importService.importSales(importFile);
      if (res.success && res.data) {
        setImportResult(res.data);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setImportError(res.message || 'Error al importar');
      }
    } catch (err: any) {
      setImportError(err.response?.data?.message || err.message || 'Error al importar');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const blob = await backupService.createBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_credis_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      alert('Respaldo descargado exitosamente');
    } catch (error: any) {
      console.error('Error al crear respaldo:', error);
      alert(error?.response?.data?.message || 'Error al crear el respaldo');
    }
  };

  const handleRestoreBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!window.confirm('⚠️ Esto sobrescribirá TODOS los datos actuales. ¿Está seguro?')) return;
      try {
        const result = await backupService.restoreBackup(file);
        alert(result.message);
        window.location.reload();
      } catch (error: any) {
        console.error('Error al restaurar:', error);
        alert(error?.response?.data?.message || 'Error al restaurar la base de datos');
      }
    };
    input.click();
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
    return (
      <div className="ajustes-container">
        <div className="ajustes-header">
          <div className="ajustes-skeleton-header"></div>
          <div className="ajustes-skeleton-subtitle"></div>
        </div>
        <div className="ajustes-content">
          <div className="ajustes-top-row">
            <div className="settings-section">
              <div className="ajustes-skeleton-section-title"></div>
              <div className="ajustes-skeleton-logo"></div>
              <div className="ajustes-skeleton-btn"></div>
            </div>
            <div className="settings-section">
              <div className="ajustes-skeleton-section-title"></div>
              <div className="ajustes-skeleton-field"></div>
              <div className="ajustes-skeleton-field"></div>
              <div className="ajustes-skeleton-btn-small"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ajustes-container">
      {/* Header */}
      <div className="ajustes-header">
        <h1 className="module-title">Ajustes del Sistema</h1>
        <p className="module-subtitle">Configuración general y preferencias del sistema</p>
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
            <i className='bx bx-error'></i> Zona de Peligro / Datos
          </h2>
          <p className="danger-subtitle">Gestiona tus copias de seguridad y sesiones activas.</p>

          <div className="danger-actions">
            <button className="btn-backup" onClick={handleCreateBackup}>
              <i className='bx bx-cloud-upload'></i>
              Crear Respaldo
            </button>

            {esGerente && (
              <button className="btn-restore" onClick={handleRestoreBackup}>
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

      {/* ==================== MODAL IMPORTAR EXCEL ==================== */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Importar Excel</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            <div className="modal-body">
              <p className="import-modal-hint">
                Selecciona un archivo Excel (.xlsx o .xls) para importar datos de ventas y compras.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleImportFileSelect}
                className="file-input"
              />

              <button
                type="button"
                className="import-modal-select-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
              >
                <i className='bx bx-file'></i>
                {importFile ? importFile.name : 'Seleccionar archivo'}
              </button>

              {importFile && (
                <p className="import-modal-file-name">
                  <i className='bx bx-check-circle'></i>
                  {importFile.name}
                </p>
              )}

              {importError && (
                <div className="import-modal-error">
                  <i className='bx bx-error-circle'></i>
                  {importError}
                </div>
              )}

              {importResult && (
                <div className="import-modal-result">
                  <div className="import-modal-result-header">
                    <i className='bx bx-check-circle'></i>
                    Importación completada
                  </div>
                  <div className="import-modal-result-grid">
                    <div className="import-modal-result-item">
                      <span>{importResult.filasProcesadas}</span>
                      <small>Filas</small>
                    </div>
                    <div className="import-modal-result-item">
                      <span>{importResult.nuevasEntradas}</span>
                      <small>Entradas</small>
                    </div>
                    <div className="import-modal-result-item">
                      <span>{importResult.nuevasSalidas}</span>
                      <small>Salidas</small>
                    </div>
                    <div className="import-modal-result-item">
                      <span>{importResult.nuevosProductos}</span>
                      <small>Productos</small>
                    </div>
                  </div>
                  {importResult.errores && importResult.errores.length > 0 && (
                    <div className="import-modal-errors">
                      <small>Errores: {importResult.errores.length}</small>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowImportModal(false)}
                  disabled={importLoading}
                >
                  Cerrar
                </button>
                <button
                  className="btn-save"
                  onClick={handleImportSubmit}
                  disabled={!importFile || importLoading}
                >
                  {importLoading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Importando...
                    </>
                  ) : (
                    <>
                      <i className='bx bx-import'></i>
                      Importar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ajustes;