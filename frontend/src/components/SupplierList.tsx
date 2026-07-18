import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supplierService } from '../services/supplier.service';
import { Proveedor } from '../types';
import { useAuth } from '../hooks/useAuth';
import './SupplierList.css';
import '../styles/moduleBase.css';
import Modal from './Modal';
import SupplierForm from './SupplierForm';

const SupplierList: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [proveedorEliminar, setProveedorEliminar] = useState<Proveedor | null>(null);
  const { usuario } = useAuth();
  const esGerente = usuario?.rol === 'gerente';

  // URL search params
  const [searchParams] = useSearchParams();
  const proveedorId = searchParams.get('proveedorId');

  const cargarDatos = useCallback(async (q: string, opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading ?? true;
    if (showLoading) setLoading(true);
    try {
      const params: any = { limite: 1000 };
      
      if (q) {
        params.busqueda = q;
      }
      
      const response = await supplierService.obtenerProveedores(params);
      setProveedores(response.proveedores);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial con indicador de carga
    cargarDatos('', { showLoading: true });
  }, [cargarDatos]);

  useEffect(() => {
    // Búsqueda con debounce; no ocultar/mostrar la tabla (evita “parpadeo”)
    const timeoutId = setTimeout(() => {
      cargarDatos(busqueda, { showLoading: false });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [busqueda, cargarDatos]);

  // Handle proveedorId parameter
  useEffect(() => {
    if (proveedorId && proveedores.length > 0) {
      // Scroll to the focused supplier
      const supplierElement = document.getElementById(`supplier-${proveedorId}`);
      if (supplierElement) {
        supplierElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        supplierElement.classList.add('highlighted');
        // Remove highlight after a few seconds
        setTimeout(() => {
          supplierElement.classList.remove('highlighted');
        }, 3000);
      }
    }
  }, [proveedorId, proveedores]);

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
      cargarDatos(busqueda, { showLoading: true });
      setShowDeleteConfirm(false);
      setProveedorEliminar(null);
    } catch (error: any) {
      alert(error.response?.data?.mensaje || 'Error al eliminar proveedor');
    }
  };

  const handleFormSuccess = () => {
    cargarDatos(busqueda, { showLoading: true });
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
    <div className="module-page supplier-list-container">
      <div className="module-page-header supplier-header">
        <div>
          <h1 className="module-title">Proveedores</h1>
          <p className="module-subtitle supplier-subtitle">Gestión de abastecedores y compras.</p>
        </div>
        <div className="module-toolbar supplier-header-actions">
          <div className="module-search supplier-search">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {esGerente && (
            <button type="button" className="module-primary-btn supplier-new-btn" onClick={handleNuevo}>
              <i className="bx bx-plus" />
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="module-card supplier-table-wrapper">
          <div className="module-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="module-skeleton-row" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="module-skeleton-cell module-skeleton-cell--avatar"></div>
                <div className="module-skeleton-cell"></div>
                <div className="module-skeleton-cell"></div>
                <div className="module-skeleton-cell module-skeleton-cell--small"></div>
                {esGerente && <div className="module-skeleton-cell module-skeleton-cell--actions"></div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="module-card supplier-table-wrapper">
          <table className="module-table suppliers-table">
            <thead>
              <tr>
                <th>Razón Social / Nombre</th>
                <th>DNI / RUC</th>
                <th>Contacto</th>
                <th>Estado</th>
                {esGerente && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? (
                <tr>
                  <td colSpan={esGerente ? 5 : 4} className="no-data">
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                proveedores.map((proveedor) => (
                  <tr key={proveedor.id} id={`supplier-${proveedor.id}`}>
                    <td className="nombre-cell">
                      <div className="supplier-name">
                        <span className="supplier-avatar-icon">
                          <i className="bx bx-building-house" />
                        </span>
                        {proveedor.nombre}
                      </div>
                    </td>
                    <td className="documento-cell">
                      <div className="documento-info">
                        <i className='bx bx-file document-icon'></i>
                        {formatRUCDNI(proveedor.ruc_dni)}
                      </div>
                    </td>
                    <td className="contacto-cell">
                      <div className="contacto-info">
                        <i className='bx bx-phone phone-icon'></i>
                        {proveedor.contacto_telefono ? formatPhone(proveedor.contacto_telefono) : 'Sin teléfono'}
                      </div>
                    </td>
                    <td className="estado-cell">
                      <div className="supplier-estado-wrap">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={proveedor.activo}
                            onChange={() => {}}
                            disabled={true}
                          />
                          <span className="slider" />
                        </label>
                        <span
                          className={`estado-label ${proveedor.activo ? 'activo' : 'inactivo'}`}
                        >
                          {proveedor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    {esGerente && (
                      <td>
                        <div className="supplier-acciones-cell">
                          <button
                            type="button"
                            onClick={() => handleEditar(proveedor)}
                            className="action-btn edit-btn"
                            title="Editar proveedor"
                          >
                            <i className="bx bx-pencil" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProveedorEliminar(proveedor);
                              setShowDeleteConfirm(true);
                            }}
                            className="action-btn delete-btn"
                            title="Eliminar proveedor"
                          >
                            <i className="bx bx-trash" />
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
