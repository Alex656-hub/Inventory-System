import React, { useState, useEffect, useCallback } from 'react';
import './UserAccess.css';
import '../styles/moduleBase.css';
import Modal from './Modal';
import { userService } from '../services/user.service';
import { Usuario, Permisos } from '../types';

const PERMISOS_DEFAULT: Permisos = {
  dashboard: false,
  catalogoProductos: false,
  operacionesStock: false,
  historialKardex: false,
  reporteInventario: false,
  alertasStock: false,
  clientes: false,
  sedesAlmacenes: false,
  proveedores: false,
  unidades: false,
  personal: false,
  categorias: false,
  usuariosAccesos: false,
  ajustes: false,
};

type ModuloKey = keyof Permisos;

const GRUPOS_PERMISOS: Array<{
  titulo: string;
  modulos: { key: ModuloKey; label: string }[];
}> = [
  {
    titulo: 'PRINCIPAL',
    modulos: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'catalogoProductos', label: 'Catálogo Productos' },
      { key: 'operacionesStock', label: 'Operaciones Stock' },
      { key: 'historialKardex', label: 'Historial Kardex' },
      { key: 'reporteInventario', label: 'Reporte Inventario' },
      { key: 'alertasStock', label: 'Alertas Stock' },
    ],
  },
  {
    titulo: 'CATÁLOGOS',
    modulos: [
      { key: 'clientes', label: 'Clientes' },
      { key: 'sedesAlmacenes', label: 'Sedes y Almacenes' },
      { key: 'proveedores', label: 'Proveedores' },
      { key: 'unidades', label: 'Unidades' },
      { key: 'personal', label: 'Personal' },
      { key: 'categorias', label: 'Categorías' },
    ],
  },
  {
    titulo: 'ADMINISTRACIÓN',
    modulos: [
      { key: 'usuariosAccesos', label: 'Usuarios y Accesos' },
      { key: 'ajustes', label: 'Ajustes' },
    ],
  },
];

const UserAccess: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    usuario: '',
    nombre: '',
    password: '',
    rol: 'empleado' as 'gerente' | 'empleado',
  });

  const [permisos, setPermisos] = useState<Permisos>({ ...PERMISOS_DEFAULT });

  const cargarUsuarios = useCallback(async () => {
    try {
      setFetching(true);
      const { usuarios } = await userService.obtenerUsuarios();
      setUsers(usuarios);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const filteredUsers = users.filter(
    (u) =>
      u.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTogglePermission = (key: ModuloKey) => {
    setPermisos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleStatus = async (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      const { usuario } = await userService.actualizarUsuario(userId, {
        activo: !user.activo,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? usuario : u))
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleEdit = (user: Usuario) => {
    setEditingUser(user);
    setFormData({
      usuario: user.usuario,
      nombre: user.nombre,
      password: '',
      rol: user.rol,
    });
    setPermisos({ ...user.permisos });
    setShowModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
      await userService.eliminarUsuario(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, activo: false } : u))
      );
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ usuario: '', nombre: '', password: '', rol: 'empleado' });
    setPermisos({ ...PERMISOS_DEFAULT });
  };

  const handleNewUser = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.usuario || !formData.nombre) return;
    if (!editingUser && !formData.password) return;

    try {
      setLoading(true);

      if (editingUser) {
        const datos: any = {
          nombre: formData.nombre,
          rol: formData.rol,
        };

        if (formData.usuario !== editingUser.usuario) {
          datos.usuario = formData.usuario;
        }

        if (formData.password) {
          datos.password = formData.password;
        }

        if (formData.rol === 'empleado') {
          datos.permisos = permisos;
        }

        const { usuario } = await userService.actualizarUsuario(
          editingUser.id,
          datos
        );

        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? usuario : u))
        );
      } else {
        const body: any = {
          usuario: formData.usuario,
          nombre: formData.nombre,
          password: formData.password,
          rol: formData.rol,
        };
        if (formData.rol === 'empleado') {
          body.permisos = permisos;
        }
        const { usuario } = await userService.crearUsuario(body);
        setUsers((prev) => [...prev, usuario]);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="module-page user-access-container">
      <div className="module-page-header user-access-header">
        <div>
          <h1 className="module-title">Usuarios y Accesos</h1>
          <p className="module-subtitle subtitle">
            Controla quién puede ver qué módulo.
          </p>
        </div>
        <div className="module-toolbar user-access-actions">
          <div className="module-search user-search">
            <i className="bx bx-search"></i>
            <input
              type="text"
              placeholder="Buscar por usuario o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="module-primary-btn new-user-btn" onClick={handleNewUser}>
            <i className="bx bx-plus"></i>
            Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="module-card users-table-container">
        {fetching ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            Cargando usuarios...
          </div>
        ) : (
          <table className="module-table users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="username-cell">{user.usuario}</td>
                  <td className="nombre-cell">{user.nombre}</td>
                  <td className="rol-cell">
                    <span
                      className={`rol-tag ${user.rol === 'gerente' ? 'admin' : 'personalizado'}`}
                    >
                      {user.rol === 'gerente' ? 'Gerente' : 'Empleado'}
                    </span>
                  </td>
                  <td className="estado-cell">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                      }}
                    >
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={user.activo}
                          onChange={() => handleToggleStatus(user.id)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span
                        className={`status-text ${user.activo ? 'active' : 'inactive'}`}
                      >
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="acciones-cell">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEdit(user)}
                      title="Editar"
                    >
                      <i className="bx bx-edit"></i>
                    </button>
                    {user.usuario !== 'gerente' && (
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(user.id)}
                        title="Desactivar"
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    {searchTerm
                      ? 'No se encontraron usuarios'
                      : 'No hay usuarios registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="large"
        contentClassName="ua-modal"
      >
        <form onSubmit={handleSubmit} className="mf-form user-form">
          <div className="form-row">
            <div className="mf-group">
              <label htmlFor="usuario">Usuario (Login)</label>
              <div className="mf-field-wrap">
                <input
                  type="text"
                  id="usuario"
                  className="mf-field"
                  value={formData.usuario}
                  onChange={(e) =>
                    setFormData({ ...formData, usuario: e.target.value })
                  }
                  required
                  placeholder="ej: juan.perez"
                />
              </div>
              <small style={{ color: '#999', fontSize: '11px', marginTop: '2px' }}>
                Se usará como {formData.usuario || 'usuario'}@credisa.com
              </small>
            </div>
            <div className="mf-group">
              <label htmlFor="nombre">Nombre Completo</label>
              <div className="mf-field-wrap">
                <input
                  type="text"
                  id="nombre"
                  className="mf-field"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="mf-group">
              <label htmlFor="rol">Rol</label>
              <div className="mf-field-wrap">
                <select
                  id="rol"
                  className="mf-field"
                  value={formData.rol}
                  onChange={(e) => {
                    const rol = e.target.value as 'gerente' | 'empleado';
                    setFormData({ ...formData, rol });
                    if (rol === 'gerente') {
                      const p: any = {};
                      for (const key of Object.keys(PERMISOS_DEFAULT)) {
                        p[key] = true;
                      }
                      setPermisos(p as Permisos);
                    } else {
                      setPermisos({ ...PERMISOS_DEFAULT });
                    }
                  }}
                >
                  <option value="empleado">Empleado</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            </div>
            <div className="mf-group">
              <label htmlFor="password">
                <i className="bx bx-lock-alt"></i> Contraseña
                {!editingUser && (
                  <span className="mf-required"> Obligatorio</span>
                )}
              </label>
              <div className="mf-field-wrap">
                <input
                  type="password"
                  id="password"
                  className="mf-field"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                  placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''}
                />
              </div>
            </div>
          </div>

          {formData.rol === 'empleado' && (
            <div className="permissions-section">
              <div className="permissions-header">
                <i className="bx bx-shield"></i>
                <h3>Permisos por Módulo</h3>
              </div>

              <div className="permissions-grid">
                {GRUPOS_PERMISOS.map((grupo) => (
                  <div key={grupo.titulo} className="permission-column">
                    <h4>{grupo.titulo}</h4>
                    {grupo.modulos.map((mod) => (
                      <div key={mod.key} className="permission-item">
                        <span>{mod.label}</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permisos[mod.key]}
                            onChange={() => handleTogglePermission(mod.key)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mf-actions user-form-actions">
            <button
              type="button"
              className="mf-btn mf-btn--ghost"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="mf-btn mf-btn--primary" disabled={loading}>
              {loading
                ? 'Guardando...'
                : editingUser
                  ? 'Actualizar Usuario'
                  : 'Guardar Usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserAccess;
