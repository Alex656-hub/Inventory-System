import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Usuario } from '../types';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('gerente' | 'empleado')[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { usuario } = authService.obtenerSesion();

  if (!authService.estaAutenticado() || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;

