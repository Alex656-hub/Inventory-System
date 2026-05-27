// src/components/Layout.tsx - Nuevo diseño moderno de sidebar

import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { usuario } = authService.obtenerSesion();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para el sidebar
  const [sidebarClosed, setSidebarClosed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Función auxiliar para saber si una ruta está activa
  const isActive = (path: string) => location.pathname === path;

  // En móvil, cerrar el sidebar automáticamente al navegar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 576px)').matches;
    if (isMobile && !sidebarClosed) {
      setSidebarClosed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarClosed(!sidebarClosed);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const esGerente = usuario?.rol === 'gerente';
  const esEmpleado = usuario?.rol === 'empleado';

  return (
    <div className={`layout ${darkMode ? 'dark' : ''}`}>
      {/* TopBar (solo móvil) */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label={sidebarClosed ? 'Abrir menú lateral' : 'Cerrar menú lateral'}
          aria-expanded={!sidebarClosed}
          type="button"
        >
          <i className='bx bx-menu'></i>
        </button>
        <div className="mobile-topbar-title">InvCred</div>
      </div>

      {/* Overlay para cerrar el drawer (solo móvil) */}
      {!sidebarClosed && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setSidebarClosed(true)}
          aria-hidden="true"
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <nav className={`sidebar ${sidebarClosed ? 'close' : ''}`}>
        <header>
          <div className="image-text">
            <span className="image">
              <i className='bx bx-package'></i>
            </span>
            <div className="text logo-text">
              <span className="name">InvCred</span>
            </div>
          </div>
          
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={sidebarClosed ? 'Abrir menú lateral' : 'Cerrar menú lateral'}
            type="button"
          >
            <i className='bx bx-menu'></i>
          </button>
        </header>

        <div className="menu-bar">
          <div className="menu">
            {/* Search Box */}
            <li className="search-box">
              <i className='bx bx-search icon'></i>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
              />
            </li>
            
            {/* List of menu links */}
            <ul className="menu-links">
              {/* Dashboard */}
              {(usuario?.permisos?.dashboard ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                  <Link to="/">
                    <i className='bx bxs-dashboard icon'></i>
                    <span className="text nav-text">Dashboard</span>
                  </Link>
                </li>
              )}
              
              {/* Catálogo Productos */}
              {(usuario?.permisos?.catalogoProductos ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/productos') ? 'active' : ''}`}>
                  <Link to="/productos">
                    <i className='bx bx-package icon'></i>
                    <span className="text nav-text">Catálogo Productos</span>
                  </Link>
                </li>
              )}
              
              {/* Operaciones Stock */}
              {(usuario?.permisos?.operacionesStock ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/operaciones-stock') ? 'active' : ''}`}>
                  <Link to="/operaciones-stock">
                    <i className='bx bx-transfer icon'></i>
                    <span className="text nav-text">Operaciones Stock</span>
                  </Link>
                </li>
              )}
              
              {/* Historial Kardex */}
              {(usuario?.permisos?.historialKardex ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/historial-kardex') ? 'active' : ''}`}>
                  <Link to="/historial-kardex">
                    <i className='bx bx-history icon'></i>
                    <span className="text nav-text">Historial Kardex</span>
                  </Link>
                </li>
              )}
              
              {/* Reporte Inventario */}
              {(usuario?.permisos?.reporteInventario ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/reporte-inventario') ? 'active' : ''}`}>
                  <Link to="/reporte-inventario">
                    <i className='bx bx-bar-chart-alt-2 icon'></i>
                    <span className="text nav-text">Reporte Inventario</span>
                  </Link>
                </li>
              )}
              
              {/* Alertas Stock */}
              {(usuario?.permisos?.alertasStock ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/alertas-stock') ? 'active' : ''}`}>
                  <Link to="/alertas-stock">
                    <i className='bx bx-bell icon'></i>
                    <span className="text nav-text">Alertas Stock</span>
                  </Link>
                </li>
              )}
              
              {/* Sedes y Almacenes */}
              {(usuario?.permisos?.sedesAlmacenes ?? esGerente) && (
                <li className={`nav-link ${isActive('/sedes-almacenes') ? 'active' : ''}`}>
                  <Link to="/sedes-almacenes">
                    <i className='bx bx-building icon'></i>
                    <span className="text nav-text">Sedes y Almacenes</span>
                  </Link>
                </li>
              )}
              
              {/* Clientes */}
              {(usuario?.permisos?.clientes ?? (esGerente || esEmpleado)) && (
                <li className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}>
                  <Link to="/clientes">
                    <i className='bx bx-user icon'></i>
                    <span className="text nav-text">Clientes</span>
                  </Link>
                </li>
              )}
              
              {/* Proveedores */}
              {(usuario?.permisos?.proveedores ?? esGerente) && (
                <li className={`nav-link ${isActive('/proveedores') ? 'active' : ''}`}>
                  <Link to="/proveedores">
                    <i className='bx bx-building-house icon'></i>
                    <span className="text nav-text">Proveedores</span>
                  </Link>
                </li>
              )}
              
              {/* Unidades */}
              {(usuario?.permisos?.unidades ?? esGerente) && (
                <li className={`nav-link ${isActive('/unidades') ? 'active' : ''}`}>
                  <Link to="/unidades">
                    <i className='bx bx-ruler icon'></i>
                    <span className="text nav-text">Unidades</span>
                  </Link>
                </li>
              )}
              
              {/* Personal */}
              {(usuario?.permisos?.personal ?? esGerente) && (
                <li className={`nav-link ${isActive('/personal') ? 'active' : ''}`}>
                  <Link to="/personal">
                    <i className='bx bx-group icon'></i>
                    <span className="text nav-text">Personal</span>
                  </Link>
                </li>
              )}
              
              {/* Categorías */}
              {(usuario?.permisos?.categorias ?? esGerente) && (
                <li className={`nav-link ${isActive('/categorias') ? 'active' : ''}`}>
                  <Link to="/categorias">
                    <i className='bx bx-category icon'></i>
                    <span className="text nav-text">Categorías</span>
                  </Link>
                </li>
              )}
              
              {/* Usuarios y Accesos */}
              {(usuario?.permisos?.usuariosAccesos ?? esGerente) && (
                <li className={`nav-link ${isActive('/usuarios') ? 'active' : ''}`}>
                  <Link to="/usuarios">
                    <i className='bx bx-shield icon'></i>
                    <span className="text nav-text">Usuarios y Accesos</span>
                  </Link>
                </li>
              )}
              
              {/* Ajustes */}
              {(usuario?.permisos?.ajustes ?? esGerente) && (
                <li className={`nav-link ${isActive('/ajustes') ? 'active' : ''}`}>
                  <Link to="/ajustes">
                    <i className='bx bx-cog icon'></i>
                    <span className="text nav-text">Ajustes</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Bottom content of the sidebar */}
          <div className="bottom-content">
            <li>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                <i className='bx bx-log-out icon'></i>
                <span className="text nav-text">Cerrar sesión</span>
              </a>
            </li>
            {/* Dark mode toggle switch */}
            <li className="mode">
              <div className="sun-moon">
                <i className='bx bx-moon icon moon'></i>
                <i className='bx bx-sun icon sun'></i>
              </div>
              <span className="mode-text text">{darkMode ? 'Light mode' : 'Dark mode'}</span>
              <div className="toggle-switch" onClick={toggleDarkMode}>
                <span className="switch"></span>
              </div>
            </li>
          </div>
        </div>
      </nav>

      {/* ==================== MAIN CONTENT ==================== */}
      <section className="content">
        {/* Navbar */}
        <nav>
          {/* Navbar vacía - sin iconos */}
        </nav>

        {/* Main Content */}
        <main>{children}</main>
      </section>
    </div>
  );
};

export default Layout;