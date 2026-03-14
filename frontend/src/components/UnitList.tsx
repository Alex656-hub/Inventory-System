import React, { useState, useEffect } from 'react';
import { unidadmedidaService } from '../services/unidadmedida.service';
import { UnidadMedida } from '../types';
import { useAuth } from '../hooks/useAuth';
import UnitModal from './UnitModal';
import UnitForm from './UnitForm';
import './UnitList.css';

const UnitList: React.FC = () => {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [unidadEditando, setUnidadEditando] = useState<UnidadMedida | null>(null);
  const [showEliminarHardConfirm, setShowEliminarHardConfirm] = useState(false);
  const [unidadEliminarHard, setUnidadEliminarHard] = useState<UnidadMedida | null>(null);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

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
    cargarDatos();
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
    return <div className="loading">Cargando unidades de medida...</div>;
  }

  return (
    <div className="unit-list-container">
      <div className="unit-list-header">
        <div>
          <h1>Unidades de Medida</h1>
          <p className="subtitle">Gestión de unidades (Kilos, Litros, Cajas).</p>
        </div>
        {esGerente && (
          <button className="new-user-btn" onClick={handleCrear}>
            <i className='bx bx-plus'></i>
            Nueva Unidad
          </button>
        )}
      </div>

      <div className="unit-table-container">
        <table className="unit-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Abreviatura</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {unidades.map((unidad) => (
              <tr key={unidad.id} className={!unidad.estado ? 'inactive' : ''}>
                <td className="unit-name">
                  <span className="unit-icon">📏</span>
                  {unidad.nombre}
                </td>
                <td className="unit-abbreviation">
                  <span className="abbr-badge">{unidad.abreviatura}</span>
                </td>
                <td className="unit-status">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={unidad.estado}
                      onChange={() => toggleEstado(unidad)}
                      disabled={!esGerente}
                    />
                    <span className="slider"></span>
                  </label>
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
            <p>No se encontraron unidades de medida</p>
          </div>
        )}
      </div>

      {/* Modal para crear/editar */}
      <UnitModal
        isOpen={showForm}
        onClose={handleFormClose}
        title={unidadEditando ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
      >
        <UnitForm
          unidad={unidadEditando}
          onClose={handleFormClose}
        />
      </UnitModal>

      {/* Modal de confirmación para eliminar permanentemente */}
      <UnitModal
        isOpen={showEliminarHardConfirm}
        onClose={() => setShowEliminarHardConfirm(false)}
        title="Eliminar Unidad Permanentemente"
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
      </UnitModal>
    </div>
  );
};

export default UnitList;
