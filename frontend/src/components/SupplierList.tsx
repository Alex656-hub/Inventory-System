import React, { useEffect, useState } from 'react';
import { supplierService } from '../services/supplier.service';
import { Proveedor } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import SupplierForm from './SupplierForm';
import './SupplierList.css';

const SupplierList: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [proveedorEliminar, setProveedorEliminar] = useState<Proveedor | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<'activo' | 'inactivo' | 'todos'>('activo');
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const params: any = { limite: 1000 };
      
      // Solo pasar activo si no es 'todos'
      if (filtroActivo === 'activo') {
        params.activo = true;
      } else if (filtroActivo === 'inactivo') {
        params.activo = false;
      }
      // Si es 'todos', no enviamos activo
      
      const response = await supplierService.obtenerProveedores(params);
      setProveedores(response.proveedores);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroActivo]);

  const handleNuevo = () => {
    setProveedorEditando(null);
    setShowForm(true);
  };

  const handleEditar = (proveedor: Proveedor) => {
    setProveedorEditando(proveedor);
    setShowForm(true);
  };

  const handleEliminar = async () => {
    if (!proveedorEliminar) return;
    
    try {
      await supplierService.eliminarProveedor(proveedorEliminar.id);
      cargarDatos();
      setShowDeleteConfirm(false);
      setProveedorEliminar(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al eliminar proveedor');
    }
  };

  const handleFormSuccess = () => {
    cargarDatos();
  };

  const formatRUCDNI = (rucDni: string): string => {
    if (rucDni.length === 11) {
      // Formato RUC: 20.123.456.789
      return rucDni.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1.$2.$3.$4');
    } else if (rucDni.length === 8) {
      // Formato DNI: 12.345.678
      return rucDni.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
    }
    return rucDni;
  };

  const formatPhone = (phone: string): string => {
    if (phone.length === 9) {
      // Formato teléfono: 987 654 321
      return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone;
  };

  return (
    <div className="supplier-list">
      <div className="page-header">
        <h1>Gestión de Proveedores</h1>
        {esGerente && (
          <button onClick={handleNuevo} className="btn-primary">
            <i className='bx bx-plus'></i> Nuevo Proveedor
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando proveedores...</div>
      ) : (
        <>
          <div className="filters">
            <label htmlFor="filtro-activo">Estado: </label>
            <select
              id="filtro-activo"
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value as 'activo' | 'inactivo' | 'todos')}
              className="filter-select"
            >
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          
          <div className="table-container">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>RUC/DNI</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                {esGerente && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? (
                <tr>
                  <td colSpan={esGerente ? 7 : 6} className="no-data">
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                proveedores.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td>{proveedor.id}</td>
                    <td className="nombre-cell">{proveedor.nombre}</td>
                    <td className="ruc-dni-cell">{formatRUCDNI(proveedor.ruc_dni)}</td>
                    <td className="contacto-cell">
                      {proveedor.contacto_telefono ? (
                        <a href={`tel:${proveedor.contacto_telefono}`} className="contact-link">
                          {formatPhone(proveedor.contacto_telefono)}
                        </a>
                      ) : (
                        <span className="no-contact">Sin teléfono</span>
                      )}
                    </td>
                    <td className="contacto-cell">
                      {proveedor.contacto_email ? (
                        <a href={`mailto:${proveedor.contacto_email}`} className="contact-link">
                          {proveedor.contacto_email}
                        </a>
                      ) : (
                        <span className="no-contact">Sin email</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${proveedor.activo ? 'success' : 'inactive'}`}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {esGerente && (
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleEditar(proveedor)}
                            className="btn-icon btn-edit"
                            title="Editar proveedor"
                          >
                            <i className='bx bx-edit'></i>
                          </button>
                          <button 
                            onClick={() => {
                              setProveedorEliminar(proveedor);
                              setShowDeleteConfirm(true);
                            }}
                            className="btn-icon btn-delete"
                            title="Eliminar proveedor"
                          >
                            <i className='bx bx-trash'></i>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setProveedorEditando(null);
        }}
        title={proveedorEditando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="large"
      >
        <SupplierForm
          proveedor={proveedorEditando}
          onClose={() => {
            setShowForm(false);
            setProveedorEditando(null);
          }}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProveedorEliminar(null);
        }}
        title="Confirmar Eliminación"
        size="small"
      >
        <p>
          ¿Estás seguro de que deseas eliminar el proveedor <strong> {proveedorEliminar?.nombre}</strong>?
        </p>
        <p className="warning-text">
          Esta acción marcará el proveedor como inactivo pero no eliminará los productos asociados.
        </p>
        <div className="form-actions">
          <button onClick={() => {
            setShowDeleteConfirm(false);
            setProveedorEliminar(null);
          }} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleEliminar} className="btn-primary" style={{ backgroundColor: '#dc3545' }}>
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SupplierList;
