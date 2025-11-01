# Solución: Error de Autenticación PostgreSQL

## Problema
Error: `la autentificación password falló para el usuario 'postgres'`

## Solución Paso a Paso

### Paso 1: Crear el archivo `.env` en la carpeta `backend/`

Crea un archivo llamado `.env` (sin extensión) en la carpeta `backend/` con el siguiente contenido:

```env
# Configuración del servidor
PORT=3001
NODE_ENV=development

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=credisa_inventory
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_DE_POSTGRES_AQUI

# JWT
JWT_SECRET=credisa_secret_key_cambiar_en_produccion_123456
JWT_EXPIRE=7d

# CORS
FRONTEND_URL=http://localhost:3000
```

**⚠️ IMPORTANTE**: Reemplaza `TU_CONTRASEÑA_DE_POSTGRES_AQUI` con la contraseña real de tu usuario PostgreSQL.

### Paso 2: Verificar tu contraseña de PostgreSQL

#### Opción A: Si no conoces la contraseña

1. Abre **SQL Shell (psql)** o **pgAdmin**
2. O usa la línea de comandos de PostgreSQL

#### Opción B: Restablecer la contraseña de PostgreSQL (Windows)

1. Abre **pgAdmin** (si está instalado)
2. O edita el archivo `pg_hba.conf` para cambiar la autenticación temporalmente

#### Opción C: Crear un nuevo usuario de PostgreSQL

En **psql** o **pgAdmin**, ejecuta:

```sql
CREATE USER credisa_user WITH PASSWORD 'tu_nueva_contraseña';
CREATE DATABASE credisa_inventory OWNER credisa_user;
GRANT ALL PRIVILEGES ON DATABASE credisa_inventory TO credisa_user;
```

Luego en tu `.env` usa:
```env
DB_USER=credisa_user
DB_PASSWORD=tu_nueva_contraseña
```

### Paso 3: Verificar que PostgreSQL esté corriendo

1. Abre **Servicios de Windows** (services.msc)
2. Busca el servicio **postgresql-x64-XX** (donde XX es la versión)
3. Asegúrate de que esté **Ejecutándose**

### Paso 4: Verificar que la base de datos existe

Conéctate a PostgreSQL y ejecuta:

```sql
-- Listar bases de datos
\l

-- Si no existe, crear la base de datos
CREATE DATABASE credisa_inventory;
```

### Paso 5: Probar la conexión

Después de crear el archivo `.env` con la contraseña correcta, ejecuta:

```bash
cd backend
npm run seed
```

### Soluciones Alternativas

#### Si PostgreSQL usa autenticación sin contraseña (trust)

1. Edita `pg_hba.conf` (normalmente en `C:\Program Files\PostgreSQL\XX\data\`)
2. Cambia `md5` o `scram-sha-256` a `trust` para localhost
3. Reinicia PostgreSQL

#### Si olvidaste la contraseña de postgres

1. Abre **Administrador de configuración de PostgreSQL**
2. O edita `pg_hba.conf` temporalmente para permitir conexiones sin contraseña
3. Cambia la contraseña
4. Restaura `pg_hba.conf`

### Verificación Rápida

Ejecuta este comando en PowerShell para verificar la conexión:

```powershell
psql -U postgres -h localhost -d credisa_inventory
```

Si funciona, te pedirá la contraseña. Si funciona, entonces el problema está en las variables de entorno del `.env`.

