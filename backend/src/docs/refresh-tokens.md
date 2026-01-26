# Sistema de Refresh Tokens

## Descripción

El sistema de refresh tokens mejora la seguridad de la autenticación mediante el uso de tokens de corta duración (access tokens) junto con tokens de larga duración (refresh tokens).

## Flujo de Autenticación

### 1. Login Inicial
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "contraseña"
}
```

**Respuesta exitosa:**
```json
{
  "mensaje": "Inicio de sesión exitoso",
  "requiere2FA": false,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "usuario@example.com",
    "rol": "gerente",
    "twoFactorEnabled": false
  }
}
```

### 2. Refrescar Access Token
Cuando el access token expira (15 minutos), usa el refresh token para obtener uno nuevo:

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Respuesta:**
```json
{
  "accessToken": "nuevo_access_token...",
  "refreshToken": "nuevo_refresh_token...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### 3. Logout
Cierra la sesión actual revocando el refresh token:

```bash
POST /api/auth/logout
Authorization: Bearer access_token
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### 4. Logout en todos los dispositivos
Cierra todas las sesiones activas del usuario:

```bash
POST /api/auth/logout-all
Authorization: Bearer access_token
```

## Configuración

### Variables de Entorno
- `JWT_SECRET`: Secreto para firmar tokens (obligatorio)
- `JWT_EXPIRE`: Tiempo de expiración del access token (default: 15m)

### Tiempos de Expiración
- **Access Token**: 15 minutos
- **Refresh Token**: 30 días
- **Token Temporal (2FA)**: 5 minutos

## Seguridad Implementada

1. **Tokens de corta duración**: Los access tokens expiran rápidamente
2. **Revocación de tokens**: Los refresh tokens pueden ser revocados individualmente
3. **Rotación de tokens**: Cada refresh genera un nuevo refresh token
4. **Limpieza automática**: Tokens expirados son eliminados periódicamente

## Endpoints

### Rutas Públicas
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Refrescar access token

### Rutas Protegidas
- `GET /api/auth/perfil` - Obtener perfil del usuario
- `POST /api/auth/logout` - Cerrar sesión actual
- `POST /api/auth/logout-all` - Cerrar todas las sesiones

### Rutas de Mantenimiento (solo gerentes)
- `DELETE /api/auth/cleanup` - Limpiar tokens expirados

## Manejo de Errores

### 401 Unauthorized
- Token inválido o expirado
- Refresh token inválido o revocado

### 400 Bad Request
- Refresh token no proporcionado
- Campos requeridos faltantes

### 404 Not Found
- Refresh token no encontrado (en logout)

## Mejores Prácticas

1. **Almacenamiento seguro**: Guarda los refresh tokens en almacenamiento seguro (httpOnly cookies o secure storage)
2. **Manejo de expiración**: Implementa lógica para refrescar tokens automáticamente antes de que expiren
3. **Validación**: Siempre valida los tokens en el backend
4. **Logout completo**: Asegúrate de llamar al endpoint de logout al cerrar sesión

## Ejemplo de Implementación en Frontend

```javascript
class AuthManager {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (response.ok) {
      this.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  }

  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    const data = await response.json();
    if (response.ok) {
      this.setTokens(data.accessToken, data.refreshToken);
    } else {
      this.logout();
    }
    return data;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  async logout() {
    if (this.refreshToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
    }
    this.clearTokens();
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}
```
