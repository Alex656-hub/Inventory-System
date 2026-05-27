import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Permisos } from '../types';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('gerente' | 'empleado')[];
  requiredPermission?: keyof Permisos;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles, requiredPermission }) => {
  const { usuario } = authService.obtenerSesion();

  if (!authService.estaAutenticado() || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !usuario.permisos?.[requiredPermission]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
