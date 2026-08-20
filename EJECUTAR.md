# 🚀 Cómo Ejecutar el Sistema de Inventario

## Opción A: Con Docker (Recomendado - Un Solo Comando)

### Desarrollo (Hot-Reload Incluido)

```powershell
# Desde la raíz del proyecto
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker up --build -d
```

**URLs:**
- Frontend: **http://localhost:3003**
- Backend API: **http://localhost:3001**
- PostgreSQL: **localhost:5432**

**Credenciales:** `gerente` / `gerente123` (o `gerente@credisa.com` / `gerente123`)

### Primer Inicio (Solo la Primera Vez)

```powershell
# 1. Levantar contenedores
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker up --build -d

# 2. Ejecutar seed (crea usuarios y datos iniciales)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec backend npm run db:seed

# 3. Abrir http://localhost:3003
```

### Comandos Diarios Docker

```powershell
# Ver logs backend (para debug)
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# Ver logs frontend
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend

# Parar (mantiene base de datos en volumen)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Parar Y borrar base de datos (limpio total)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Rebuild tras cambios en package.json o Dockerfile
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# Ejecutar seed manualmente
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec backend npm run db:seed

# Entrar al contenedor backend (terminal)
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend sh
```

---

## Opción B: Tradicional (Sin Docker - Requiere Node.js + PostgreSQL Instalados)

### Opción 1: Ejecutar Backend y Frontend por Separado (Recomendado)

#### Terminal 1 - Backend

```powershell
cd backend
npm run dev
```

Deberías ver:
```
✅ Conexión a la base de datos establecida correctamente.
✅ Modelos sincronizados con la base de datos.
🚀 Servidor corriendo en http://localhost:3001
```

#### Terminal 2 - Frontend

Abre **otra terminal PowerShell** y ejecuta:

```powershell
cd frontend
npm start
```

El navegador se abrirá automáticamente en `http://localhost:3000`

---

## Opción 2: Ejecutar Todo desde la Raíz

Desde la carpeta raíz del proyecto:

```powershell
npm run dev
```

Esto iniciará backend y frontend simultáneamente.

---

## Primera Vez - Verificar que todo está listo

### Con Docker (Opción A)
1. ✅ **Docker Desktop corriendo** (icono ballena en bandeja sistema)
2. ✅ **WSL 2 habilitado** (`wsl --status` → "Versión predeterminada: 2")
3. ✅ **Archivo `.env.docker`** existe en la raíz
4. ✅ **Contenedores levantados** (`docker ps` muestra 3 contenedores)
5. ✅ **Seed ejecutado**: `docker compose exec backend npm run db:seed`

### Tradicional (Opción B)
1. ✅ **PostgreSQL está corriendo**
2. ✅ **Base de datos creada**: `credisa_inventory`
3. ✅ **Archivo `.env`** creado en `backend/` con la contraseña correcta
4. ✅ **Dependencias instaladas**: `npm install` en backend y frontend
5. ✅ **Seed ejecutado**: `npm run seed` en backend

---

## Iniciar Sesión

### Con Docker (Opción A)
1. Abre tu navegador en **http://localhost:3003**
2. Ingresa con:
   - **Usuario**: `gerente` (o email `gerente@credisa.com`)
   - **Contraseña**: `gerente123`

### Tradicional (Opción B)
1. Abre tu navegador en `http://localhost:3000`
2. Ingresa con:
   - **Email**: `gerente@credisa.com`
   - **Contraseña**: `gerente123`

---

## Comandos Útiles

### Detener el servidor
Presiona `Ctrl + C` en la terminal

### Ver logs del backend
Los logs aparecen en la terminal donde ejecutaste `npm run dev` (backend)

### Ver errores
- Backend: Revisa la terminal del backend
- Frontend: Revisa la consola del navegador (F12)

---

## Solución de Problemas

### Backend no inicia
- Verifica que PostgreSQL esté corriendo
- Verifica que el archivo `.env` existe y tiene la contraseña correcta
- Verifica que la base de datos `credisa_inventory` existe

### Frontend no se conecta al backend
- Verifica que el backend esté corriendo en el puerto 3001
- Verifica el archivo `frontend/.env` (si existe) o `frontend/src/config/api.ts`

### Error de CORS
- Verifica que `FRONTEND_URL=http://localhost:3000` esté en `backend/.env`

---

### Problemas Específicos de Docker

#### Docker Desktop no inicia (Windows)
- Verifica virtualización en BIOS/UEFI
- PowerShell Admin:
  ```powershell
  dism /online /enable-feature /featurename:Microsoft-Hyper-V /all /norestart
  dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
  wsl --install
  Restart-Computer -Force
  ```

#### Puerto 3003 ocupado
```powershell
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

#### Base de datos no persiste
```powershell
# NO uses 'down -v' si quieres mantener datos
docker compose down  # Sin -v mantiene volúmenes
```

#### Frontend no conecta al backend en Docker
- Verifica `REACT_APP_API_URL=http://localhost:3001/api` en `.env.docker`
- En producción (nginx), usa URL relativa `/api` (configurado en `nginx.conf`)

---

## 📊 Configuración de la Base de Datos

### 1. Crear la Base de Datos

Antes de ejecutar el sistema, crea una base de datos PostgreSQL llamada `credisa_inventory`:

```sql
CREATE DATABASE credisa_inventory;
```

### 2. Exportar/Importar Datos de la Base de Datos

Para transferir el sistema a otro entorno:

#### Exportar la base de datos completa:
```bash
pg_dump -U [usuario] -h [host] credisa_inventory > backup.sql
```

#### Importar la base de datos:
```bash
psql -U [usuario] -h [host] -d credisa_inventory < backup.sql
```

### 3. Usuarios de Prueba

Si necesitas usuarios iniciales, inserta estos en la base de datos (ajusta las contraseñas con hashes bcrypt válidos):

```sql
-- Gerente
INSERT INTO usuarios (nombre, email, password, rol, activo, "twoFactorEnabled", "createdAt", "updatedAt")
VALUES ('Gerente Principal', 'gerente@credisa.com', '[hash_para_gerente123]', 'gerente', true, false, NOW(), NOW());

-- Empleado
INSERT INTO usuarios (nombre, email, password, rol, activo, "twoFactorEnabled", "createdAt", "updatedAt")
VALUES ('Empleado Ejemplo', 'empleado@credisa.com', '[hash_para_empleado123]', 'empleado', true, false, NOW(), NOW());
```

Reemplaza `[hash_para_gerente123]` y `[hash_para_empleado123]` con hashes bcrypt generados para esas contraseñas.

### 4. Orden de Ejecución Recomendado

1. **Configurar la base de datos** (crear DB y importar datos si aplica)
2. **Ejecutar el backend** (`npm run dev` en `/backend`)
3. **Ejecutar el frontend** (`npm start` en `/frontend`)
4. **Acceder al sistema** en `http://localhost:3000`

### Notas Importantes

- Asegúrate de que PostgreSQL esté corriendo y las credenciales en `backend/src/config/database.ts` sean correctas.
- Las tablas se crean automáticamente con Sequelize al iniciar el backend.
- Para producción, configura variables de entorno para la DB y JWT.
