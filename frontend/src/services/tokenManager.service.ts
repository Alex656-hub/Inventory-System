import api from '../config/api';
import { RefreshTokenResponse } from '../types';

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<RefreshTokenResponse | null> | null = null;
  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly TOKEN_EXPIRY_KEY = 'tokenExpiry';

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  // Guardar tokens
  setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    const expiryTime = Date.now() + (expiresIn * 1000);
    
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  // Obtener access token
  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Obtener refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // Verificar si el token está por expirar (dentro de 1 minuto)
  isTokenExpiringSoon(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    
    const expiry = parseInt(expiryTime);
    const oneMinuteFromNow = Date.now() + 60000; // 1 minuto
    
    return expiry <= oneMinuteFromNow;
  }

  // Verificar si hay tokens válidos
  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    if (!accessToken || !refreshToken || !expiryTime) {
      return false;
    }
    
    const expiry = parseInt(expiryTime);
    return Date.now() < expiry;
  }

  // Verificar si existe un refresh token (permite refrescar incluso si el access token expiró)
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken();
  }

  // Indica si se debe intentar un refresco: hay refresh token y el access token está expirado o por expirar
  debeRefrescar(): boolean {
    return this.hasRefreshToken() && (!this.hasValidTokens() || this.isTokenExpiringSoon());
  }

  // Refrescar el access token
  async refreshAccessToken(): Promise<RefreshTokenResponse | null> {
    // Si ya hay un refresh en progreso, retornar esa promesa
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return null;
    }

    this.refreshPromise = this.performRefresh(refreshToken);

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<RefreshTokenResponse | null> {
    try {
      const { data } = await api.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken
      });

      // Guardar nuevos tokens
      this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);

      return data;
    } catch (error) {
      console.error('Error al refrescar token:', error);
      this.clearTokens();
      return null;
    }
  }

  // Limpiar todos los tokens
  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  // Obtener tokens para headers
  getAuthHeaders(): { Authorization?: string } {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export default TokenManager.getInstance();
