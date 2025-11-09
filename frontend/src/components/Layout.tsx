import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useTheme } from '../contexts';
import { DEFAULT_THEME } from '../contexts/ThemeContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { usuario } = authService.obtenerSesion();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Aplicar el tema guardado del usuario al cargar el Layout (después del login)
  useEffect(() => {
    // Si el tema actual es el por defecto (login), intentar cargar el tema guardado
    if (theme === DEFAULT_THEME) {
      const savedTheme = localStorage.getItem('theme') as string | null;
      if (savedTheme) {
        setTheme(savedTheme as any);
      }
    }
  }, [theme, setTheme]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const esGerente = usuario?.rol === 'gerente';

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-brand">
          <h2>Inventario CREDISA</h2>
        </div>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/productos">Productos</Link>
          {esGerente && <Link to="/categorias">Categorías</Link>}
          {esGerente && <Link to="/proveedores">Proveedores</Link>}
          {esGerente && <Link to="/usuarios">Usuarios</Link>}
          <Link to="/configuraciones">Configuraciones</Link>
        </div>
        <div className="nav-user">
          <span>¡Hola, {usuario?.nombre}!</span>
          <span className="user-role">{usuario?.rol === 'gerente' ? '👑 Gerente' : '👤 Empleado'}</span>
          <button onClick={handleLogout} className="btn-logout">
            Salir
          </button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

