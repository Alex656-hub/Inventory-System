// src/components/Layout.tsx - Layout con topbar + sidebar segmentado

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { searchService } from '../services/search.service';
import { GlobalSearchResponse } from '../types';
import TwoFactorModal from './TwoFactorModal';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { usuario } = authService.obtenerSesion();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: usuario?.nombre || '',
    numero: usuario?.usuario || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  // Búsqueda global
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 576px)').matches;
    if (isMobile && !sidebarOpen) {
      setSidebarOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    if (!usuario?.id) return;
    setSaving(true);
    try {
      const datos: { nombre: string; password?: string } = {
        nombre: editForm.nombre
      };
      if (editForm.password.trim()) {
        datos.password = editForm.password;
      }
      await userService.actualizarUsuario(usuario.id, datos);
      authService.guardarSesion({ ...usuario, nombre: editForm.nombre });
      setShowEditModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error al guardar perfil:', error);
    } finally {
      setSaving(false);
    }
  };

  const esGerente = usuario?.rol === 'gerente';

  // Búsqueda global con debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (value.trim().length < 2) {
      setSearchResults(null);
      setShowResults(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchService.busquedaGlobal(value.trim(), 4);
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const handleSearchResultClick = (path: string) => {
    setShowResults(false);
    setSearchQuery('');
    setSearchResults(null);
    navigate(path);
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderNavLink = (
    path: string,
    icon: string,
    label: string,
    permiso?: boolean
  ) => {
    if (!permiso) return null;
    return (
      <li className={isActive(path) ? 'active' : ''}>
        <Link to={path}>
          <i className={`bx ${icon}`}></i>
          <span className="nav-text">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="layout">
      {/* TopBar móvil */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
          aria-expanded={sidebarOpen}
          type="button"
        >
          <i className='bx bx-menu'></i>
        </button>
        <div className="mobile-topbar-title">InvCred</div>
      </div>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setSidebarOpen(true)}
          aria-hidden="true"
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Segmento 1: Tarjeta de usuario */}
        <div className="sidebar-user-card">
          <span className="sidebar-section-label">USUARIO</span>
          <div className="sidebar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="sidebar-user-avatar">
              {esGerente ? 'G' : 'E'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{usuario?.nombre || 'Usuario'}</span>
              <span className="sidebar-user-role">{esGerente ? 'Gerente' : 'Empleado'}</span>
            </div>
            <i className={`bx bx-chevron-${showUserMenu ? 'up' : 'down'} sidebar-user-arrow`}></i>
          </div>

          {showUserMenu && (
            <div className="sidebar-user-dropdown">
              <button onClick={() => { setShowEditModal(true); setShowUserMenu(false); }}>
                <i className='bx bx-edit'></i> Editar perfil
              </button>
              <button onClick={() => { setShowSecurityModal(true); setShowUserMenu(false); }}>
                <i className='bx bx-shield-quarter'></i> Seguridad
              </button>
              <button onClick={handleLogout}>
                <i className='bx bx-log-out'></i> Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Segmento 2: Navegación agrupada */}
        <div className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-group-label">RESUMEN</span>
            <ul>
              {renderNavLink('/', 'bxs-dashboard', 'Dashboard', usuario?.permisos?.dashboard ?? true)}
              {renderNavLink('/alertas-stock', 'bx-bell', 'Alertas Stock', usuario?.permisos?.alertasStock ?? true)}
            </ul>
          </div>

          <div className="nav-group">
            <span className="nav-group-label">INVENTARIO</span>
            <ul>
              {renderNavLink('/productos', 'bx-package', 'Catálogo Productos', usuario?.permisos?.catalogoProductos ?? true)}
              {renderNavLink('/operaciones-stock', 'bx-transfer', 'Operaciones Stock', usuario?.permisos?.operacionesStock ?? true)}
              {renderNavLink('/historial-kardex', 'bx-history', 'Historial Kardex', usuario?.permisos?.historialKardex ?? true)}
              {renderNavLink('/reporte-inventario', 'bx-bar-chart-alt-2', 'Reporte Inventario', usuario?.permisos?.reporteInventario ?? true)}
            </ul>
          </div>

          <div className="nav-group">
            <span className="nav-group-label">EMPRESA</span>
            <ul>
              {renderNavLink('/sedes-almacenes', 'bx-building', 'Sedes y Almacenes', usuario?.permisos?.sedesAlmacenes ?? esGerente)}
              {renderNavLink('/clientes', 'bx-user', 'Clientes', usuario?.permisos?.clientes ?? true)}
              {renderNavLink('/proveedores', 'bx-building-house', 'Proveedores', usuario?.permisos?.proveedores ?? esGerente)}
              {renderNavLink('/personal', 'bx-group', 'Personal', usuario?.permisos?.personal ?? esGerente)}
            </ul>
          </div>

          <div className="nav-group">
            <span className="nav-group-label">CONFIGURACION</span>
            <ul>
              {renderNavLink('/unidades', 'bx-ruler', 'Unidades', usuario?.permisos?.unidades ?? esGerente)}
              {renderNavLink('/categorias', 'bx-category', 'Categorías', usuario?.permisos?.categorias ?? esGerente)}
              {renderNavLink('/usuarios', 'bx-shield', 'Usuarios y Accesos', usuario?.permisos?.usuariosAccesos ?? esGerente)}
              {renderNavLink('/ajustes', 'bx-cog', 'Ajustes', usuario?.permisos?.ajustes ?? esGerente)}
            </ul>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT ==================== */}
      <section className="content">
        {/* ==================== TOPBAR ==================== */}
        <nav className="desktop-topbar">
          <div className="topbar-left">
            <i className='bx bx-package topbar-logo-icon'></i>
            <span className="topbar-brand">InvCred</span>
          </div>

          <div className="topbar-center" ref={searchRef}>
            <i className='bx bx-search topbar-search-icon'></i>
            <input
              type="text"
              className="topbar-search"
              placeholder="Buscar productos, ventas, categorías, proveedores..."
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => searchResults && setShowResults(true)}
            />

            {/* Dropdown de resultados */}
            {showResults && searchResults && (
              <div className="search-dropdown">
                {searchLoading && (
                  <div className="search-dropdown-loading">
                    <span className="search-spinner"></span>
                    Buscando...
                  </div>
                )}

                {!searchLoading && (
                  <>
                    {searchResults.productos.length === 0 &&
                     searchResults.ventas.length === 0 &&
                     searchResults.categorias.length === 0 &&
                     searchResults.proveedores.length === 0 && (
                      <div className="search-dropdown-empty">
                        <i className='bx bx-search'></i>
                        <span>No se encontraron resultados</span>
                      </div>
                    )}

                    {searchResults.productos.length > 0 && (
                      <div className="search-group">
                        <div className="search-group-header">
                          <i className='bx bx-package'></i>
                          Productos
                          <span className="search-group-count">{searchResults.productos.length}</span>
                        </div>
                        {searchResults.productos.map(p => (
                          <div
                            key={p.id}
                            className="search-item"
                            onClick={() => handleSearchResultClick('/productos')}
                          >
                            <div className="search-item-name">{p.nombre}</div>
                            <div className="search-item-meta">
                              {p.codigo}
                              {p.categoria && <> · {p.categoria.nombre}</>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.ventas.length > 0 && (
                      <div className="search-group">
                        <div className="search-group-header">
                          <i className='bx bx-cart'></i>
                          Ventas
                          <span className="search-group-count">{searchResults.ventas.length}</span>
                        </div>
                        {searchResults.ventas.map(v => (
                          <div
                            key={v.id}
                            className="search-item"
                            onClick={() => handleSearchResultClick('/ventas')}
                          >
                            <div className="search-item-name">Venta {v.numero}</div>
                            <div className="search-item-meta">
                              {new Date(v.fecha).toLocaleDateString('es-PE')} · S/ {v.total.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.categorias.length > 0 && (
                      <div className="search-group">
                        <div className="search-group-header">
                          <i className='bx bx-category'></i>
                          Categorías
                          <span className="search-group-count">{searchResults.categorias.length}</span>
                        </div>
                        {searchResults.categorias.map(c => (
                          <div
                            key={c.id}
                            className="search-item"
                            onClick={() => handleSearchResultClick('/categorias')}
                          >
                            <div className="search-item-name">{c.nombre}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.proveedores.length > 0 && (
                      <div className="search-group">
                        <div className="search-group-header">
                          <i className='bx bx-building-house'></i>
                          Proveedores
                          <span className="search-group-count">{searchResults.proveedores.length}</span>
                        </div>
                        {searchResults.proveedores.map(p => (
                          <div
                            key={p.id}
                            className="search-item"
                            onClick={() => handleSearchResultClick('/proveedores')}
                          >
                            <div className="search-item-name">{p.nombre}</div>
                            <div className="search-item-meta">{p.ruc_dni}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="topbar-right">
            <div className="topbar-avatar">
              {esGerente ? 'G' : 'E'}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>{children}</main>
      </section>

      {/* ==================== MODAL EDITAR PERFIL ==================== */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar perfil</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <i className='bx bx-x'></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="mf-group">
                <label>Nombre</label>
                <input
                  type="text"
                  className="mf-field"
                  value={editForm.nombre}
                  onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                />
              </div>
              <div className="mf-group">
                <label>Número de usuario</label>
                <input
                  type="text"
                  className="mf-field"
                  value={editForm.numero}
                  onChange={e => setEditForm({ ...editForm, numero: e.target.value })}
                />
              </div>
              <div className="mf-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  className="mf-field"
                  placeholder="Dejar vacío para no cambiar"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ==================== MODAL SEGURIDAD 2FA ==================== */}
      {showSecurityModal && (
        <TwoFactorModal
          onClose={() => setShowSecurityModal(false)}
          onSessionChanged={() => window.location.reload()}
        />
      )}
    </div>
  );
};

export default Layout;
