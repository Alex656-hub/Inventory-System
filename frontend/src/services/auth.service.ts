import api from '../config/api';
import { LoginRequest, LoginResponse, Usuario } from '../types';

export const authService = {
  login: async (credenciales: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credenciales);
    return data;
  },

  obtenerPerfil: async (): Promise<Usuario> => {
    const { data } = await api.get<Usuario>('/auth/perfil');
    return data;
  },

  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  },

  guardarSesion: (token: string, usuario: Usuario): void => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  },

  obtenerSesion: (): { token: string | null; usuario: Usuario | null } => {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
    return { token, usuario };
  },

  estaAutenticado: (): boolean => {
    const token = localStorage.getItem('token');
    return !!token;
  }
};

