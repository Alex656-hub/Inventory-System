// src/components/Layout.tsx - Nuevo diseño moderno de sidebar

import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { searchService } from '../services/search.service';
import { alertService } from '../services/alert.service';
import { GlobalSearchResponse, Alert } from '../types';
import Ajustes from './Ajustes';
import './Layout.css';
import './Ajustes.css';

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

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Estado para alertas
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Función auxiliar para saber si una ruta está activa
  const isActive = (path: string) => location.pathname === path;

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

  // Logout functions
  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar todas las sesiones en todos los dispositivos?')) {
      await authService.logoutAll();
      navigate('/login');
    }
  };

  const esGerente = usuario?.rol === 'gerente';
  const esEmpleado = usuario?.rol === 'empleado';

  return (
    <div className={`layout ${darkMode ? 'dark' : ''}`}>
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
            onClick={toggleSidebar}
            style={{
              position: 'absolute',
              top: '50%',
              right: sidebarClosed ? '-25px' : '5px',
              transform: 'translateY(-50%)',
              width: '35px',
              height: '35px',
              backgroundColor: '#00a6f4', /* sky-500 */
              color: 'white',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              zIndex: 1000,
              boxShadow: 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <i className='bx bx-chevron-right'></i>
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
              <li className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                <Link to="/">
                  <i className='bx bxs-dashboard icon'></i>
                  <span className="text nav-text">Dashboard</span>
                </Link>
              </li>
              
              {/* Catálogo Productos */}
              <li className={`nav-link ${isActive('/productos') ? 'active' : ''}`}>
                <Link to="/productos">
                  <i className='bx bx-package icon'></i>
                  <span className="text nav-text">Catálogo Productos</span>
                </Link>
              </li>
              
              {/* Operaciones Stock */}
              <li className={`nav-link ${isActive('/operaciones-stock') ? 'active' : ''}`}>
                <Link to="/operaciones-stock">
                  <i className='bx bx-transfer icon'></i>
                  <span className="text nav-text">Operaciones Stock</span>
                </Link>
              </li>
              
              {/* Historial Kardex */}
              <li className={`nav-link ${isActive('/historial-kardex') ? 'active' : ''}`}>
                <Link to="/historial-kardex">
                  <i className='bx bx-history icon'></i>
                  <span className="text nav-text">Historial Kardex</span>
                </Link>
              </li>
              
              {/* Reporte Inventario */}
              <li className={`nav-link ${isActive('/reporte-inventario') ? 'active' : ''}`}>
                <Link to="/reporte-inventario">
                  <i className='bx bx-bar-chart-alt-2 icon'></i>
                  <span className="text nav-text">Reporte Inventario</span>
                </Link>
              </li>
              
              {/* Alertas Stock */}
              <li className={`nav-link ${isActive('/alertas-stock') ? 'active' : ''}`}>
                <Link to="/alertas-stock">
                  <i className='bx bx-bell icon'></i>
                  <span className="text nav-text">Alertas Stock</span>
                </Link>
              </li>
              
              {/* Sedes y Almacenes */}
              {esGerente && (
                <li className={`nav-link ${isActive('/sedes-almacenes') ? 'active' : ''}`}>
                  <Link to="/sedes-almacenes">
                    <i className='bx bx-building icon'></i>
                    <span className="text nav-text">Sedes y Almacenes</span>
                  </Link>
                </li>
              )}
              
              {/* Clientes */}
              {(esGerente || esEmpleado) && (
                <li className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}>
                  <Link to="/clientes">
                    <i className='bx bx-user icon'></i>
                    <span className="text nav-text">Clientes</span>
                  </Link>
                </li>
              )}
              
              {/* Proveedores */}
              {esGerente && (
                <li className={`nav-link ${isActive('/proveedores') ? 'active' : ''}`}>
                  <Link to="/proveedores">
                    <i className='bx bx-building-house icon'></i>
                    <span className="text nav-text">Proveedores</span>
                  </Link>
                </li>
              )}
              
              {/* Personal */}
              {esGerente && (
                <li className={`nav-link ${isActive('/personal') ? 'active' : ''}`}>
                  <Link to="/personal">
                    <i className='bx bx-group icon'></i>
                    <span className="text nav-text">Personal</span>
                  </Link>
                </li>
              )}
              
              {/* Categorías */}
              {esGerente && (
                <li className={`nav-link ${isActive('/categorias') ? 'active' : ''}`}>
                  <Link to="/categorias">
                    <i className='bx bx-category icon'></i>
                    <span className="text nav-text">Categorías</span>
                  </Link>
                </li>
              )}
              
              {/* Unidades */}
              {esGerente && (
                <li className={`nav-link ${isActive('/unidades') ? 'active' : ''}`}>
                  <Link to="/unidades">
                    <i className='bx bx-ruler icon'></i>
                    <span className="text nav-text">Unidades</span>
                  </Link>
                </li>
              )}
              
              {/* Usuarios y Accesos */}
              {esGerente && (
                <li className={`nav-link ${isActive('/usuarios') ? 'active' : ''}`}>
                  <Link to="/usuarios">
                    <i className='bx bx-shield icon'></i>
                    <span className="text nav-text">Usuarios y Accesos</span>
                  </Link>
                </li>
              )}
              
              {/* Ajustes */}
              {esGerente && (
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