import axios from 'axios';
import tokenManager from '../services/tokenManager.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL
});

// Endpoints de autenticación en los que NO se debe intentar refrescar:
// - login / verify-2fa: no tiene sentido refrescar con tokens residuales de una sesión anterior
// - refresh: evita deadlock (refrescar la propia petición de refresh)
const esEndpointAuth = (url: unknown): boolean =>
  typeof url === 'string' &&
  (url.includes('/auth/login') || url.includes('/auth/verify-2fa') || url.includes('/auth/refresh'));

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  async (config) => {
    // Refrescar si el access token está expirado o por expirar (no solo cuando aún es válido)
    if (!esEndpointAuth(config.url) && tokenManager.debeRefrescar()) {
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
    
    // Si el error es 401, no es un intento de refresco previo, hay un refresh token,
    // y la petición no es un endpoint de autenticación (evita deadlock y bucles)
    if (error.response?.status === 401 &&
        !originalRequest._retry &&
        tokenManager.hasRefreshToken() &&
        !esEndpointAuth(originalRequest.url)) {
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

