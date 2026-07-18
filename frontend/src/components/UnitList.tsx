import React, { useState, useEffect } from 'react';
import { unidadmedidaService } from '../services/unidadmedida.service';
import { UnidadMedida } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import UnitForm from './UnitForm';
import './UnitList.css';
import '../styles/moduleBase.css';

const UnitList: React.FC = () => {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [unidadEditando, setUnidadEditando] = useState<UnidadMedida | null>(null);
  const [showEliminarHardConfirm, setShowEliminarHardConfirm] = useState(false);
  const [unidadEliminarHard, setUnidadEliminarHard] = useState<UnidadMedida | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  const filteredUnidades = unidades.filter(unidad => 
    unidad.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    unidad.abreviatura.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await unidadmedidaService.obtenerUnidades();
      setUnidades(response.unidades);
    } catch (error) {
      console.error('Error al cargar unidades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrear = () => {
    setUnidadEditando(null);
    setShowForm(true);
  };

  const handleEditar = (unidad: UnidadMedida) => {
    setUnidadEditando(unidad);
    setShowForm(true);
  };

  const handleEliminarHard = (unidad: UnidadMedida) => {
    setUnidadEliminarHard(unidad);
    setShowEliminarHardConfirm(true);
  };

  const confirmarEliminarHard = async () => {
    if (!unidadEliminarHard) return;

    try {
      await unidadmedidaService.eliminarUnidadHard(unidadEliminarHard.id);
      await cargarDatos();
      setShowEliminarHardConfirm(false);
      setUnidadEliminarHard(null);
    } catch (error) {
      console.error('Error al eliminar unidad:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setUnidadEditando(null);
  };

  const handleFormSuccess = () => {
    cargarDatos(); // Solo recargar cuando se guarda exitosamente
  };

  const toggleEstado = async (unidad: UnidadMedida) => {
    try {
      if (unidad.estado) {
        await unidadmedidaService.desactivarUnidad(unidad.id);
      } else {
        await unidadmedidaService.activarUnidad(unidad.id);
      }
      await cargarDatos();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  if (loading) {
    return (
      <div className="module-page unit-list-container">
        <div className="module-page-header unit-list-header">
          <div>
            <h1 className="module-title">Unidades de Medida</h1>
            <p className="module-subtitle subtitle">Gestión de unidades (Unidad, Paquete, Caja).</p>
          </div>
        </div>
        <div className="module-card unit-table-container">
          <div className="module-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="module-skeleton-row" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="module-skeleton-cell module-skeleton-cell--icon"></div>
                <div className="module-skeleton-cell module-skeleton-cell--pill"></div>
                <div className="module-skeleton-cell module-skeleton-cell--small"></div>
                <div className="module-skeleton-cell module-skeleton-cell--actions"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page unit-list-container">
      <div className="module-page-header unit-list-header">
        <div>
          <h1 className="module-title">Unidades de Medida</h1>
          <p className="module-subtitle subtitle">Gestión de unidades (Unidad, Paquete, Caja).</p>
        </div>
        <div className="module-toolbar unit-list-actions">
          <div className="module-search unit-search">
            <i className='bx bx-search'></i>
            <input
              type="text"
              placeholder="Buscar por nombre o abreviatura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {esGerente && (
            <button className="module-primary-btn new-user-btn" onClick={handleCrear}>
              <i className='bx bx-plus'></i>
              Nueva Unidad
            </button>
          )}
        </div>
      </div>

      <div className="module-card unit-table-container">
        <table className="module-table unit-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Abreviatura</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnidades.map((unidad) => (
              <tr key={unidad.id} className={!unidad.estado ? 'inactive' : ''}>
                <td className="unit-name">
                  <i className='bx bx-ruler unit-icon'></i>
                  {unidad.nombre}
                </td>
                <td className="unit-abbreviation">
                  <span className="abbr-badge" translate="no">
                    {unidad.abreviatura || 'SIN ABREV'}
                  </span>
                </td>
                <td className="unit-status">
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={unidad.estado}
                        onChange={() => toggleEstado(unidad)}
                        disabled={!esGerente}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`status-text ${unidad.estado ? 'active' : 'inactive'}`}>
                      {unidad.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </td>
                <td className="unit-actions">
                  {esGerente && (
                    <>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEditar(unidad)}
                        title="Editar"
                      >
                        <i className='bx bx-edit'></i>
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleEliminarHard(unidad)}
                        title="Eliminar permanentemente"
                      >
                        <i className='bx bx-trash'></i>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {unidades.length === 0 && (
          <div className="no-data">
            <i className='bx bx-ruler' style={{ fontSize: '32px', color: 'var(--color-sky-200)', marginBottom: '8px' }}></i>
            <p>No se encontraron unidades de medida</p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar */}
      <Modal
        isOpen={showForm}
        onClose={handleFormClose}
        title={unidadEditando ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
        size="xs"
      >
        <UnitForm
          unidad={unidadEditando}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* Modal de confirmación para eliminar permanentemente */}
      <Modal
        isOpen={showEliminarHardConfirm}
        onClose={() => setShowEliminarHardConfirm(false)}
        title="Eliminar Unidad Permanentemente"
        size="xs"
      >
        <div className="confirm-modal">
          <p>
            ¿Estás seguro de que quieres eliminar permanentemente la unidad "{unidadEliminarHard?.nombre}"? Esta acción no se puede deshacer.
          </p>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowEliminarHardConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-danger"
              onClick={confirmarEliminarHard}
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UnitList;
