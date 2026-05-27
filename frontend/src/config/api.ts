import axios from 'axios';
import tokenManager from '../services/tokenManager.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  async (config) => {
    // Solo verificar refresco si hay una sesión activa (evitar bucle en login)
    if (tokenManager.hasValidTokens() && tokenManager.isTokenExpiringSoon()) {
      await tokenManager.refreshAccessToken();
    }
    
    const headers = tokenManager.getAuthHeaders();
    if (headers.Authorization) {
      config.headers.Authorization = headers.Authorization;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación y refrescar tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si el error es 401, no es un intento de refresco previo, y hay una sesión activa
    if (error.response?.status === 401 && !originalRequest._retry && tokenManager.hasValidTokens()) {
      originalRequest._retry = true;
      
      // Intentar refrescar el token
      const refreshResult = await tokenManager.refreshAccessToken();
      
      if (refreshResult) {
        // Reintentar la petición original con el nuevo token
        const headers = tokenManager.getAuthHeaders();
        if (headers.Authorization) {
          originalRequest.headers.Authorization = headers.Authorization;
        }
        
        return api(originalRequest);
      } else {
        // Si no se puede refrescar, limpiar y redirigir al login
        tokenManager.clearTokens();
        localStorage.removeItem('usuario');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

