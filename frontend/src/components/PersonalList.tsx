import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import PersonalForm from './PersonalForm';
import { personalService, PersonalItem } from '../services/personal.service';
import './PersonalList.css';
import '../styles/moduleBase.css';

const PersonalList: React.FC = () => {
  const [items, setItems] = useState<PersonalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalItem | null>(null);

  const formatearTelefono = (telefono: string): string => {
    if (!telefono) return '';
    const soloNumeros = telefono.replace(/\D/g, '');
    
    // Formatear cada 3 dígitos: 987654321 -> 987 654 321
    if (soloNumeros.length <= 3) return soloNumeros;
    if (soloNumeros.length <= 6) return soloNumeros.slice(0, 3) + ' ' + soloNumeros.slice(3);
    return soloNumeros.slice(0, 3) + ' ' + soloNumeros.slice(3, 6) + ' ' + soloNumeros.slice(6);
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await personalService.obtenerPersonal();
      setItems(response.personal);
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

  const handleGuardar = async (formData: Omit<PersonalItem, 'id'>) => {
    try {
      if (editingItem) {
        // Editar personal existente
        await personalService.actualizarPersonal(editingItem.id, formData);
      } else {
        // Crear nuevo personal
        await personalService.crearPersonal(formData);
      }
      setShowForm(false);
      setEditingItem(null);
      cargarDatos(); // Recargar la lista
    } catch (error: any) {
      console.error('Error al guardar personal:', error);
      alert(error.response?.data?.mensaje || 'Error al guardar personal');
    }
  };

  const toggleEstado = async (id: number) => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;
      
      await personalService.actualizarPersonal(id, { activo: !item.activo });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, activo: !item.activo } : item
        )
      );
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      alert(error.response?.data?.mensaje || 'Error al cambiar estado');
    }
  };

  const eliminar = async (id: number) => {
    if (!window.confirm('¿Deseas eliminar este registro de personal?')) return;
    try {
      await personalService.eliminarPersonal(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar personal:', error);
      alert(error.response?.data?.mensaje || 'Error al eliminar personal');
    }
  };

  if (loading) {
    return <div className="module-page personal-list-container">Cargando...</div>;
  }

  return (
    <div className="module-page personal-list-container">
      <div className="module-page-header personal-header">
        <div>
          <h1 className="module-title">Personal</h1>
          <p className="module-subtitle">Empleados y responsables de almacén.</p>
        </div>
        <div className="module-toolbar personal-header-actions">
          <div className="module-search personal-search">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Buscar por nombre o rol..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button className="module-primary-btn personal-new-btn" onClick={handleCrear}>
            <i className="bx bx-plus" />
            Nuevo Personal
          </button>
        </div>
      </div>

      <div className="module-card personal-table-wrapper">
        <table className="module-table personal-table">
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
                    {formatearTelefono(item.telefono || '') || '-'}
                  </span>
                </td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={item.activo}
                        onChange={() => toggleEstado(item.id)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className={`estado-label ${item.activo ? 'activo' : 'inactivo'}`}>
                      {item.activo ? 'Activo' : 'Inactivo'}
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
