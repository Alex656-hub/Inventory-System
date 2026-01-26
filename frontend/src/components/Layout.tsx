// src/components/Layout.tsx (versión final corregida - 17 nov 2025)

import React, { useEffect, useState } from 'react';
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

  // Función auxiliar para saber si una ruta está activa
  const isActive = (path: string) => location.pathname === path;

  const [sidebarClosed, setSidebarClosed] = useState(false);
  const [searchShow, setSearchShow] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  // Responsive: cerrar sidebar en pantallas pequeñas
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarClosed(true);
      } else {
        setSidebarClosed(false);
      }
      if (window.innerWidth > 576) {
        setSearchShow(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarClosed(!sidebarClosed);
  const toggleSearch = (e: React.MouseEvent) => {
    if (window.innerWidth <= 576) {
      e.preventDefault();
      setSearchShow(!searchShow);
    }
  };

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

          {/* Buscador */}
          <form action="#" onSubmit={(e) => e.preventDefault()}>
            <div className={`form-input ${searchShow ? 'show' : ''}`}>
              <input type="search" placeholder="Buscar..." />
              <button className="search-btn" type="submit" onClick={toggleSearch}>
                <i className={`bx ${searchShow ? 'bx-x' : 'bx-search'}`}></i>
              </button>
            </div>
          </form>

          {/* Iconos a la derecha */}
          <div className="nav-right">
            <a href="#" className="notif">
              <i className='bx bx-bell'></i>
              <span className="count">12</span>
            </a>
            <a href="#" className="notif">
              <i className='bx bx-refresh'></i>
            </a>
            <a href="#" className="profile">
              <img src="/images/profile.png" alt="Perfil" />
            </a>
          </div>
        </nav>

        {/* ==================== CONTENIDO PRINCIPAL ==================== */}
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;