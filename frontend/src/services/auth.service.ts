import api from '../config/api';
import { LoginRequest, LoginResponse, Usuario, LogoutRequest } from '../types';
import tokenManager from './tokenManager.service';

export const authService = {
  login: async (credenciales: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credenciales);
    
    // Guardar tokens si el login es exitoso y no requiere 2FA
    if (!data.requiere2FA && data.accessToken && data.refreshToken && data.expiresIn) {
      tokenManager.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    }
    
    return data;
  },

  login2FA: async (email: string, token: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/verify-2fa', { email, token });
    
    // Guardar tokens si la verificación 2FA es exitosa
    if (data.accessToken && data.refreshToken && data.expiresIn) {
      tokenManager.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    }
    
    return data;
  },

  obtenerPerfil: async (): Promise<Usuario> => {
    const { data } = await api.get<Usuario>('/auth/perfil');
    return data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = tokenManager.getRefreshToken();
    
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken } as LogoutRequest);
      } catch (error) {
        console.error('Error al hacer logout en el servidor:', error);
      }
    }
    
    tokenManager.clearTokens();
    localStorage.removeItem('usuario');
  },

  logoutAll: async (): Promise<void> => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.error('Error al hacer logout en todos los dispositivos:', error);
    }
    
    tokenManager.clearTokens();
    localStorage.removeItem('usuario');
  },

  guardarSesion: (usuario: Usuario): void => {
    localStorage.setItem('usuario', JSON.stringify(usuario));
  },

  obtenerSesion: (): { usuario: Usuario | null } => {
    const usuarioStr = localStorage.getItem('usuario');
    const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
    return { usuario };
  },

  estaAutenticado: (): boolean => {
    return tokenManager.hasValidTokens();
  },

  // Método para verificar si el token está por expirar
  isTokenExpiringSoon: (): boolean => {
    return tokenManager.isTokenExpiringSoon();
  },

  // Método para refrescar el token
  refreshToken: async (): Promise<boolean> => {
    const result = await tokenManager.refreshAccessToken();
    return result !== null;
  }
};

