import React, { useState } from 'react';
import './UserAccess.css';

interface User {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  rolType: 'admin' | 'personalizado';
  estado: boolean;
}

interface UserPermissions {
  dashboard: boolean;
  stock: boolean;
  reports: boolean;
  products: boolean;
  clients: boolean;
  suppliers: boolean;
  staff: boolean;
  branches: boolean;
  categories: boolean;
  globalConfig: boolean;
}

const UserAccess: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      username: 'admin',
      nombre: 'Administrador Principal',
      rol: 'Admin Total',
      rolType: 'admin',
      estado: true
    },
    {
      id: 2,
      username: 'almacenero',
      nombre: 'juan',
      rol: 'Personalizado',
      rolType: 'personalizado',
      estado: false
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [accessLevel, setAccessLevel] = useState<'admin' | 'custom'>('custom');
  const [permissions, setPermissions] = useState<UserPermissions>({
    dashboard: false,
    stock: false,
    reports: false,
    products: false,
    clients: false,
    suppliers: false,
    staff: false,
    branches: false,
    categories: false,
    globalConfig: false
  });
  const [formData, setFormData] = useState({
    username: '',
    nombre: '',
    rol: 'empleado',
    password: ''
  });

  const handleTogglePermission = (permission: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const handleToggleStatus = (userId: number) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, estado: !user.estado } : user
    ));
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      nombre: user.nombre,
      rol: user.rolType === 'admin' ? 'gerente' : 'empleado',
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = (userId: number) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { 
              ...user, 
              username: formData.username,
              nombre: formData.nombre,
              rol: formData.rol === 'gerente' ? 'Admin Total' : 'Personalizado',
              rolType: formData.rol === 'gerente' ? 'admin' : 'personalizado'
            } 
          : user
      ));
    } else {
      const newUser: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        username: formData.username,
        nombre: formData.nombre,
        rol: formData.rol === 'gerente' ? 'Admin Total' : 'Personalizado',
        rolType: formData.rol === 'gerente' ? 'admin' : 'personalizado',
        estado: true
      };
      setUsers([...users, newUser]);
    }

    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: '', nombre: '', rol: 'empleado', password: '' });
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({ username: '', nombre: '', rol: 'empleado', password: '' });
    setAccessLevel('custom');
    setPermissions({
      dashboard: false,
      stock: false,
      reports: false,
      products: false,
      clients: false,
      suppliers: false,
      staff: false,
      branches: false,
      categories: false,
      globalConfig: false
    });
    setShowModal(true);
  };

  return (
    <div className="user-access-container">
      <div className="user-access-header">
        <div>
          <h1>Usuarios y Accesos</h1>
          <p className="subtitle">Controla quién puede ver qué módulo.</p>
        </div>
        <button className="new-user-btn" onClick={handleNewUser}>
          <i className='bx bx-plus'></i>
          Nuevo Usuario
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
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
            {users.map(user => (
              <tr key={user.id}>
                <td className="username-cell">{user.username}</td>
                <td className="nombre-cell">{user.nombre}</td>
                <td className="rol-cell">
                  <span className={`rol-tag ${user.rolType}`}>
                    {user.rol}
                  </span>
                </td>
                <td className="estado-cell">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={user.estado}
                      onChange={() => handleToggleStatus(user.id)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
                <td className="acciones-cell">
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => handleEdit(user)}
                    title="Editar"
                  >
                    <i className='bx bx-edit'></i>
                  </button>
                  {user.rolType !== 'admin' && (
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(user.id)}
                      title="Eliminar"
                    >
                      <i className='bx bx-trash'></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                <i className='bx bx-x'></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Usuario (Login)</label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nombre">Nombre Completo</label>
                  <input
                    type="text"
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="accessLevel">Nivel de Acceso</label>
                  <select
                    id="accessLevel"
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as 'admin' | 'custom')}
                  >
                    <option value="admin">Administrador Total</option>
                    <option value="custom">Personalizado (Elegir módulos)</option>
                  </select>
                </div>

                {!editingUser && (
                  <div className="form-group">
                    <label htmlFor="password">
                      <i className='bx bx-lock-alt'></i> Contraseña
                      <span className="required">Obligatorio</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                )}
              </div>

              {accessLevel === 'custom' && (
                <div className="permissions-section">
                  <div className="permissions-header">
                    <i className='bx bx-shield'></i>
                    <h3>Permisos por Módulo</h3>
                  </div>
                  
                  <div className="permissions-grid">
                    <div className="permission-column">
                      <h4>PRINCIPAL</h4>
                      <div className="permission-item">
                        <span>Ver Dashboard / Resumen</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.dashboard}
                            onChange={() => handleTogglePermission('dashboard')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Operaciones de Stock</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.stock}
                            onChange={() => handleTogglePermission('stock')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Ver Reportes y Kardex</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.reports}
                            onChange={() => handleTogglePermission('reports')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="permission-column">
                      <h4>CATÁLOGOS</h4>
                      <div className="permission-item">
                        <span>Gestionar Productos</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.products}
                            onChange={() => handleTogglePermission('products')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Gestionar Clientes</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.clients}
                            onChange={() => handleTogglePermission('clients')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Gestionar Proveedores</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.suppliers}
                            onChange={() => handleTogglePermission('suppliers')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Gestionar Personal</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.staff}
                            onChange={() => handleTogglePermission('staff')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Gestionar Sedes</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.branches}
                            onChange={() => handleTogglePermission('branches')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="permission-item">
                        <span>Categorías y Unidades</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={permissions.categories}
                            onChange={() => handleTogglePermission('categories')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="global-config-section">
                    <div className="permission-item">
                      <span>Acceso a Configuración Global</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={permissions.globalConfig}
                          onChange={() => handleTogglePermission('globalConfig')}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submit-btn">
                  {editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccess;