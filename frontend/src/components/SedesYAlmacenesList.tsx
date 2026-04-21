import React, { useEffect, useState } from 'react';
import { sedeService, Sede, Almacen, SedeFilters } from '../services/sede.service';
import Modal from './Modal';
import SedesYAlmacenesForm from './SedesYAlmacenesForm';
import './SedesYAlmacenesList.css';
import '../styles/moduleBase.css';

const SedesYAlmacenesList: React.FC = () => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
    const [filters, setFilters] = useState<SedeFilters>({
    pagina: 1,
    limite: 10,
    tipo: '',
    estado: '',
    orden: 'createdAt',
    direccion: 'DESC'
  });
  const [paginacion, setPaginacion] = useState({
    total: 0,
    pagina: 1,
    limite: 10,
    totalPaginas: 0
  });
  
  useEffect(() => {
    cargarDatos();
  }, [filters]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await sedeService.obtenerSedes(filters);
      setSedes(response.data);
      setPaginacion(response.paginacion);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearSede = () => {
    setEditingSede(null);
    setShowModal(true);
  };

  const handleEditarSede = (sede: Sede) => {
    setEditingSede(sede);
    setShowModal(true);
  };

  const handleEliminarSede = async (sede: Sede) => {
    if (window.confirm(`¿Estás seguro de eliminar la sede "${sede.nombre}"?`)) {
      try {
        await sedeService.eliminarSede(sede.id);
        cargarDatos();
      } catch (error) {
        console.error('Error al eliminar sede:', error);
        alert('Error al eliminar la sede. Puede que tenga almacenes asociados.');
      }
    }
  };

  const handleToggleEstado = async (sede: Sede) => {
    try {
      await sedeService.toggleEstadoSede(sede.id);
      cargarDatos();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleGuardarSede = async (sedeData: any) => {
    try {
      if (editingSede) {
        await sedeService.actualizarSede(editingSede.id, sedeData);
      } else {
        await sedeService.crearSede(sedeData);
      }
      setShowModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar sede:', error);
      throw error;
    }
  };

  const handlePageChange = (pagina: number) => {
    setFilters({ ...filters, pagina });
  };

  
  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      tienda: 'Tienda (Punto de Venta)',
      almacen: 'Almacén'
    };
    return labels[tipo] || tipo;
  };

  const getEstadoBadge = (estado: string) => {
    return estado === 'activo' ? 'activo' : 'inactivo';
  };

  if (loading) {
    return <div className="module-page sedes-almacenes-container module-loading">Cargando...</div>;
  }

  return (
    <div className="module-page sedes-almacenes-container">
      <div className="module-page-header">
        <div>
          <h1 className="module-title">Sedes y Almacenes</h1>
          <p className="module-subtitle">Gestión de sedes y espacios de almacenamiento.</p>
        </div>
        <div className="module-toolbar">
          <button className="module-primary-btn" onClick={handleCrearSede}>
            <i className='bx bx-plus'></i>
            Nueva Sede
          </button>
        </div>
      </div>

      
      <div className="module-card">
        <table className="module-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sedes.map((sede) => (
              <tr key={sede.id} className={!sede.estado ? 'inactive' : ''}>
                <td className="name-cell">
                  <div className="sede-name-cell">
                    <span className="sede-icon">{'\ud83c\udfe2'}</span>
                    <div>
                      <strong>{sede.nombre}</strong>
                      {sede.almacenes && (
                        <span className="almacenes-count">
                          {sede.almacenes.length} almacén(es)
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>{getTipoLabel(sede.tipo)}</td>
                <td>{sede.direccion}</td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={sede.estado === 'activo'}
                        onChange={() => handleToggleEstado(sede)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`status-text ${sede.estado === 'activo' ? 'active' : 'inactive'}`}>
                      {sede.estado}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEditarSede(sede)}
                      title="Editar"
                    >
                      <i className='bx bx-edit'></i>
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleEliminarSede(sede)}
                      title="Eliminar"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sedes.length === 0 && (
          <div className="module-empty">No se encontraron registros.</div>
        )}
      </div>

      {paginacion.totalPaginas > 1 && (
        <div className="pagination">
          <button
            disabled={paginacion.pagina <= 1}
            onClick={() => handlePageChange(paginacion.pagina - 1)}
            className="pagination-btn"
          >
            <i className='bx bx-chevron-left'></i>
          </button>
          <span className="pagination-info">
            Página {paginacion.pagina} de {paginacion.totalPaginas}
          </span>
          <button
            disabled={paginacion.pagina >= paginacion.totalPaginas}
            onClick={() => handlePageChange(paginacion.pagina + 1)}
            className="pagination-btn"
          >
            <i className='bx bx-chevron-right'></i>
          </button>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSede ? 'Editar Sede' : 'Nueva Sede'}
        size="small"
      >
        <SedesYAlmacenesForm
          sede={editingSede}
          onSave={handleGuardarSede}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

export default SedesYAlmacenesList;
