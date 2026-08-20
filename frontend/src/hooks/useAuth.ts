import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { Usuario } from '../types';

interface UseAuthReturn {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; requiere2FA?: boolean; error?: string }>;
  login2FA: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación al cargar el componente
  const checkAuth = useCallback(async () => {
    try {
      const { usuario: usuarioGuardado } = authService.obtenerSesion();

      // Permitir recuperar la sesión aunque el access token haya expirado (mientras exista refresh token)
      if (authService.tieneTokens() && usuarioGuardado) {
          // Verificar si el token está por expirar o ya expiró y refrescar si es necesario
          if (authService.debeRefrescar()) {
            const refreshSuccess = await authService.refreshToken();
            if (!refreshSuccess) {
              // Si no se puede refrescar, limpiar sesión
              await authService.logout();
              setUsuario(null);
              setIsAuthenticated(false);
              setLoading(false);
              return;
            }
          }
          
          // Obtener datos actualizados del perfil
          try {
            const perfilActualizado = await authService.obtenerPerfil();
            setUsuario(perfilActualizado);
            authService.guardarSesion(perfilActualizado);
            setIsAuthenticated(true);
          } catch (error) {
            // Si hay error al obtener el perfil, limpiar sesión
            await authService.logout();
            setUsuario(null);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      if (response.requiere2FA) {
        return { success: false, requiere2FA: true };
      } else {
        authService.guardarSesion(response.usuario);
        setUsuario(response.usuario);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.mensaje || 'Error al iniciar sesión' 
      };
    }
  };

  // Login con 2FA
  const login2FA = async (email: string, code: string) => {
    try {
      const response = await authService.login2FA(email, code);
      authService.guardarSesion(response.usuario);
      setUsuario(response.usuario);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.mensaje || 'Código 2FA inválido' 
      };
    }
  };

  // Logout
  const logout = async () => {
    await authService.logout();
    setUsuario(null);
    setIsAuthenticated(false);
  };

  // Logout en todos los dispositivos
  const logoutAll = async () => {
    await authService.logoutAll();
    setUsuario(null);
    setIsAuthenticated(false);
  };

  // Efecto para verificar autenticación al cargar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Efecto para verificar periódicamente si el token está por expirar
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (authService.debeRefrescar()) {
        authService.refreshToken().catch(() => {
          // Si falla el refresco, hacer logout
          logout();
        });
      }
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    usuario,
    isAuthenticated,
    loading,
    login,
    login2FA,
    logout,
    logoutAll,
    checkAuth
  };
};
