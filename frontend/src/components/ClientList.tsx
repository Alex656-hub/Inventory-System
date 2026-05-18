import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import ClientForm, { Cliente } from './ClientForm';
import clientService from '../services/client.service';
import '../styles/moduleBase.css';
import './ClientList.css';

const ClientList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const data = await clientService.listar();
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.nombre, c.documento, c.telefono, c.email].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [busqueda, clientes]);

  const handleNuevo = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEditar = (c: Cliente) => {
    setEditing(c);
    setShowForm(true);
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Deseas eliminar este cliente?')) return;
    try {
      await clientService.eliminar(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleSave = async (data: Omit<Cliente, 'id'>) => {
    try {
      if (editing) {
        const actualizado = await clientService.actualizar(editing.id, data);
        setClientes((prev) => prev.map((c) => (c.id === editing.id ? actualizado : c)));
      } else {
        const creado = await clientService.crear(data);
        setClientes((prev) => [creado, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar el cliente');
    }
  };

  return (
    <div className="module-page client-list-page">
      <div className="module-page-header">
        <div>
          <h1 className="module-title">Clientes</h1>
          <p className="module-subtitle">Base de datos de clientes y contactos.</p>
        </div>
        <div className="module-toolbar">
          <div className="module-search">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button type="button" className="module-primary-btn" onClick={handleNuevo}>
            <i className="bx bx-plus" />
            Nuevo
          </button>
        </div>
      </div>

      <div className="module-card">
        <table className="module-table client-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Nombre / Razón Social</th>
              <th style={{ textAlign: 'left' }}>Documento</th>
              <th style={{ textAlign: 'left' }}>Contacto</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="module-empty">Cargando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="module-empty">
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'left' }}>
                    <div className="client-name-cell">
                      <span className="client-avatar">
                        <i className="bx bx-user" />
                      </span>
                      {c.nombre}
                    </div>
                  </td>
                  <td className="client-doc" style={{ textAlign: 'left' }}>{c.documento || '-'}</td>
                  <td className="client-contact" style={{ textAlign: 'left' }}>{c.telefono || c.email || '-'}</td>
                  <td>
                    <div className="client-status">
                      <label className="switch">
                        <input type="checkbox" checked={c.estado} readOnly />
                        <span className="slider" />
                      </label>
                      <span className={`estado-label ${c.estado ? 'activo' : 'inactivo'}`}>
                        {c.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="client-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar"
                        onClick={() => handleEditar(c)}
                      >
                        <i className="bx bx-pencil" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Eliminar"
                        onClick={() => handleEliminar(c.id)}
                      >
                        <i className="bx bx-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        title={editing ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="medium"
      >
        <ClientForm
          cliente={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      </Modal>
    </div>
  );
};

export default ClientList;