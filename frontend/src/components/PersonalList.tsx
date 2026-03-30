import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import PersonalForm from './PersonalForm';
import './PersonalList.css';

interface PersonalItem {
  id: number;
  nombreCompleto: string;
  cargo: string;
  telefono: string;
  estado: boolean;
}

const PersonalList: React.FC = () => {
  const [items, setItems] = useState<PersonalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalItem | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Simulación de datos - reemplazar con servicio real
      const mockData: PersonalItem[] = [
        { id: 1, nombreCompleto: 'Jose', cargo: 'Almacenero', telefono: '987654321', estado: true },
        { id: 2, nombreCompleto: 'Miguel', cargo: 'Repartidor', telefono: '987654312', estado: true }
      ];
      setItems(mockData);
    } catch (error) {
      console.error('Error al cargar personal:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const itemsFiltrados = items.filter((item) =>
    item.nombreCompleto.toLowerCase().includes(busqueda.trim().toLowerCase()) ||
    item.cargo.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  const handleCrear = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditar = (item: PersonalItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleGuardar = (formData: Omit<PersonalItem, 'id'>) => {
    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, ...formData }
            : item
        )
      );
    } else {
      const nextId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      setItems((prev) => [...prev, { id: nextId, ...formData }]);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleEstado = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, estado: !item.estado } : item
      )
    );
  };

  const eliminar = (id: number) => {
    if (!window.confirm('¿Deseas eliminar este registro de personal?')) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return <div className="personal-list-container">Cargando...</div>;
  }

  return (
    <div className="personal-list-container">
      <div className="personal-header">
        <div>
          <h1>Personal</h1>
          <p>Empleados y responsables de almacén.</p>
        </div>
        <div className="personal-header-actions">
          <div className="personal-search">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Buscar por nombre o rol..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button className="personal-new-btn" onClick={handleCrear}>
            <i className="bx bx-plus" />
            Nuevo Personal
          </button>
        </div>
      </div>

      <div className="personal-table-wrapper">
        <table className="personal-table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Rol / Cargo</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="personal-name-cell">
                    <span className="avatar-icon">
                      <i className="bx bx-id-card" />
                    </span>
                    {item.nombreCompleto}
                  </div>
                </td>
                <td>
                  <span className="cargo-pill">{item.cargo}</span>
                </td>
                <td>
                  <span className="phone-cell">
                    <i className="bx bx-phone" />
                    {item.telefono || '-'}
                  </span>
                </td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={item.estado}
                        onChange={() => toggleEstado(item.id)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`estado-label ${item.estado ? 'activo' : 'inactivo'}`}>
                      {item.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="acciones-cell">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEditar(item)}
                      title="Editar"
                    >
                      <i className="bx bx-pencil" />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => eliminar(item.id)}
                      title="Eliminar"
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {itemsFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">No se encontraron registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Editar Miembro' : 'Nuevo Miembro'}
        size="small"
      >
        <PersonalForm
          item={editingItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSave={handleGuardar}
        />
      </Modal>
    </div>
  );
};

export default PersonalList;
