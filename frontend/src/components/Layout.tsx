// src/components/Layout.tsx (versión final corregida - 17 nov 2025)

import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { searchService } from '../services/search.service';
import { alertService } from '../services/alert.service';
import { GlobalSearchResponse, Alert } from '../types';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { usuario } = authService.obtenerSesion();
  const navigate = useNavigate();
  const location = useLocation();

  // Función auxiliar para saber si una ruta está activa
  const isActive = (path: string) => location.pathname === path;

  const [sidebarClosed, setSidebarClosed] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Alert state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  // Ref para debounce
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for UX features
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Responsive: cerrar sidebar en pantallas pequeñas
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarClosed(true);
      } else {
        setSidebarClosed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    closeSearch();
    loadAlerts();
  }, [location.pathname]);

  // Load alerts on component mount and periodically
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await alertService.getAlerts({
        resolved: false,
        limite: 10
      });
      setAlerts(response.alertas);
      setAlertCount(response.alertas.length);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  // Keyboard shortcut to focus search bar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or / to focus search
      if ((event.ctrlKey && event.key === 'k') || event.key === '/') {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      // Escape to close dropdown
      if (event.key === 'Escape') {
        closeSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const closeSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
    setShowResults(false);
  };
  const toggleSidebar = () => setSidebarClosed(!sidebarClosed);

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

  // Función para realizar búsqueda global
  const performSearch = async (query: string) => {
    if (query.trim().length === 0) {
      setSearchResults(null);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchService.busquedaGlobal(query.trim());
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      setSearchResults(null);
      setShowResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handler para cambios en el input de búsqueda
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Limpiar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Si el valor está vacío, limpiar resultados inmediatamente
    if (value.trim().length === 0) {
      setSearchResults(null);
      setShowResults(false);
      setSearchLoading(false);
      return;
    }

    // Establecer nuevo timeout para debounce
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  };

  const esGerente = usuario?.rol === 'gerente';
  const esEmpleado = usuario?.rol === 'empleado';

  // Componentes reutilizables para búsqueda
  const SearchResultsDropdown: React.FC = () => (
    <>
      {showResults && searchResults && (
        <div ref={searchDropdownRef} className="search-dropdown">
          <div className="search-dropdown-inner">
            {/* Productos */}
            {searchResults.productos.length > 0 && (
              <div className="search-section">
                <h4>Productos</h4>
                <ul>
                  {searchResults.productos.slice(0, 5).map((producto) => (
                    <li key={producto.id}>
                      <Link to={`/productos?focusId=${producto.id}`} onClick={() => setShowResults(false)}>
                        <strong>{producto.nombre}</strong> ({producto.codigo})
                        {producto.categoria && <span> - {producto.categoria.nombre}</span>}
                        <br />
                        <small>{producto.resumen}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ventas */}
            {searchResults.ventas.length > 0 && (
              <div className="search-section">
                <h4>Ventas</h4>
                <ul>
                  {searchResults.ventas.slice(0, 5).map((venta) => (
                    <li key={venta.id}>
                      <Link to={`/ventas?ventaId=${venta.id}`} onClick={() => setShowResults(false)}>
                        <strong>Venta #{venta.numero}</strong> - {venta.fecha}
                        <br />
                        <small>{venta.resumen}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Categorías */}
            {searchResults.categorias.length > 0 && (
              <div className="search-section">
                <h4>Categorías</h4>
                <ul>
                  {searchResults.categorias.slice(0, 5).map((categoria) => (
                    <li key={categoria.id}>
                      <Link to={`/categorias?categoriaId=${categoria.id}`} onClick={() => setShowResults(false)}>
                        <strong>{categoria.nombre}</strong>
                        <br />
                        <small>{categoria.resumen}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Proveedores */}
            {searchResults.proveedores.length > 0 && (
              <div className="search-section">
                <h4>Proveedores</h4>
                <ul>
                  {searchResults.proveedores.slice(0, 5).map((proveedor) => (
                    <li key={proveedor.id}>
                      <Link to={`/proveedores?proveedorId=${proveedor.id}`} onClick={() => setShowResults(false)}>
                        <strong>{proveedor.nombre}</strong> - {proveedor.ruc_dni}
                        <br />
                        <small>{proveedor.resumen}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mensaje si no hay resultados */}
            {searchResults.productos.length === 0 &&
             searchResults.ventas.length === 0 &&
             searchResults.categorias.length === 0 &&
             searchResults.proveedores.length === 0 && (
              <div className="no-results">
                No se encontraron resultados para "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
      {/* Indicador de carga */}
      {searchLoading && (
        <div className="search-loading">
          <i className='bx bx-loader-alt bx-spin'></i> Buscando...
        </div>
      )}
    </>
  );

  // Componente para dropdown de alertas
  const AlertDropdown: React.FC = () => (
    <>
      {showAlertDropdown && (
        <div className="alert-dropdown">
          <div className="alert-dropdown-inner">
            <div className="alert-header">
              <h4>Alertas Recientes</h4>
              <Link to="/alertas" onClick={() => setShowAlertDropdown(false)}>
                Ver todas
              </Link>
            </div>

            {alerts.length > 0 ? (
              <ul>
                {alerts.slice(0, 5).map((alert) => (
                  <li key={alert.id} className={`alert-item ${alert.severity}`}>
                    <div className="alert-content">
                      <strong>{alert.product?.nombre || 'Producto'}</strong>
                      <p>{alert.message}</p>
                      <small>{new Date(alert.created_at).toLocaleDateString()}</small>
                    </div>
                    <div className="alert-actions">
                      {esGerente && !alert.resolved && (
                        <button
                          className="btn-sm btn-success"
                          onClick={async (e) => {
                            e.preventDefault();
                            await alertService.resolveAlert(alert.id);
                            loadAlerts();
                          }}
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-alerts">
                No hay alertas activas
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="layout">
      {/* ==================== SIDEBAR ==================== */}
      <div className={`sidebar ${sidebarClosed ? 'close' : ''}`}>
        <Link to="/" className="logo">
          <i className='bx bx-package'></i>
          <div className="logo-name">
            <span className="logo-part">Inv</span>
            <span className="logo-part cred">Cred</span>
          </div>
        </Link>

        <ul className="side-menu">
          <li className={isActive('/') ? 'active' : ''}>
            <Link to="/">
              <i className='bx bxs-dashboard'></i> Dashboard
            </Link>
          </li>
          <li className={isActive('/productos') ? 'active' : ''}>
            <Link to="/productos">
              <i className='bx bx-store-alt'></i> Productos
            </Link>
          </li>
          {esGerente && (
            <li className={isActive('/categorias') ? 'active' : ''}>
              <Link to="/categorias">
                <i className='bx bx-analyse'></i> Categorías
              </Link>
            </li>
          )}
          {esGerente && (
            <li className={isActive('/proveedores') ? 'active' : ''}>
              <Link to="/proveedores">
                <i className='bx bx-message-square-dots'></i> Proveedores
              </Link>
            </li>
          )}
          {(esGerente || esEmpleado) && (
            <li className={isActive('/ventas') ? 'active' : ''}>
              <Link to="/ventas">
                <i className='bx bx-cart-alt'></i> Ventas
              </Link>
            </li>
          )}
          {(esGerente || esEmpleado) && (
            <li className={isActive('/ventas/resumen') ? 'active' : ''}>
              <Link to="/ventas/resumen">
                <i className='bx bx-bar-chart-alt'></i> Resumen Ventas
              </Link>
            </li>
          )}
          {esGerente && (
            <li className={isActive('/importar') ? 'active' : ''}>
              <Link to="/importar">
                <i className='bx bx-upload'></i> Importar Excel
              </Link>
            </li>
          )}
          {esGerente && (
            <li className={isActive('/usuarios') ? 'active' : ''}>
              <Link to="/usuarios">
                <i className='bx bx-group'></i> Usuarios
              </Link>
            </li>
          )}
          <li className={isActive('/configuraciones') ? 'active' : ''}>
            <Link to="/configuraciones">
              <i className='bx bx-cog'></i> Configuraciones
            </Link>
          </li>
        </ul>

        <ul className="side-menu">
          <li className={`logout-menu ${showLogoutMenu ? 'show' : ''}`}>
            <a href="#" className="logout" onClick={(e) => { e.preventDefault(); setShowLogoutMenu(!showLogoutMenu); }}>
              <i className='bx bx-log-out-circle'></i>
              Salir
              <i className={`bx bx-chevron-${showLogoutMenu ? 'up' : 'down'} arrow`}></i>
            </a>
            <ul className="logout-submenu">
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                  <i className='bx bx-log-out'></i>
                  Cerrar sesión actual
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogoutAll(); }}>
                  <i className='bx bx-log-out-circle'></i>
                  Cerrar todas las sesiones
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="content">
        {/* ==================== NAVBAR ==================== */}
        <nav>
          {/* Menú hamburguesa */}
          <i className='bx bx-menu' onClick={toggleSidebar}></i>

          {/* Buscador: solo mostrar cuando NO hay búsqueda activa */}
          {!searchTerm.trim() && (
            <form action="#" onSubmit={(e) => e.preventDefault()}>
              <div className="form-input">
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                />
                <button
                  className="search-btn"
                  type="button"
                >
                  <i className='bx bx-search'></i>
                </button>
              </div>
            </form>
          )}

          {/* Iconos a la derecha */}
          <div className="nav-right">
            <a href="#" className="notif" onClick={(e) => { e.preventDefault(); setShowAlertDropdown(!showAlertDropdown); }}>
              <i className='bx bx-bell'></i>
              {alertCount > 0 && <span className="count">{alertCount}</span>}
            </a>
            <a href="#" className="notif">
              <i className='bx bx-refresh'></i>
            </a>
            <a href="#" className="profile">
              <img src="/images/profile.png" alt="Perfil" />
            </a>
          </div>
        </nav>

        {/* Overlay oscuro y form flotante cuando hay búsqueda activa */}
        {searchTerm.trim().length > 0 && (
          <>
            {/* Overlay que oscurece TODO */}
            <div className="search-overlay" onClick={closeSearch} />
            {/* Botón X fuera del contenedor principal */}
            <button
              className="search-close-btn"
              type="button"
              onClick={closeSearch}
            >
              <i className='bx bx-x'></i>
            </button>
            {/* Form flotante con input y dropdown iluminados */}
            <div className="search-form-floating">
              <form action="#" onSubmit={(e) => e.preventDefault()}>
                <div className="form-input">
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                  />
                </div>
                <SearchResultsDropdown />
              </form>
            </div>
          </>
        )}

        {/* Alert Dropdown */}
        <AlertDropdown />

        {/* ==================== CONTENIDO PRINCIPAL ==================== */}
        <main>{children}</main>
      </div>
    </div>
  );
} // Added the missing closing brace for the Layout function

  export default Layout;