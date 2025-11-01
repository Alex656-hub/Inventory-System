# Sistema de Gestión de Inventario - CREDISA

Sistema web de gestión de inventario con capacidades de análisis financiero predictivo desarrollado para Comercial CREDISA en Bagua, Perú.

## Stack Tecnológico

- **Frontend**: React.js con TypeScript
- **Backend**: Node.js con Express y TypeScript
- **Base de datos**: PostgreSQL
- **Machine Learning**: Python con scikit-learn/TensorFlow
- **Autenticación**: JWT

## Estructura del Proyecto

```
Inventory-System/
├── backend/          # API REST con Node.js + Express
├── frontend/         # Aplicación React + TypeScript
├── ml-service/       # Servicio de Machine Learning en Python
└── database/         # Scripts de base de datos
```

## Instalación

### Paso 1: Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm run install:all

# O manualmente
cd backend && npm install
cd ../frontend && npm install
```

### Paso 2: Configurar Base de Datos PostgreSQL

**IMPORTANTE**: Antes de continuar, necesitas:

1. **PostgreSQL instalado y corriendo**
2. **Crear la base de datos**:
   ```sql
   CREATE DATABASE credisa_inventory;
   ```
3. **Conocer tu contraseña de PostgreSQL**

### Paso 3: Configurar Variables de Entorno del Backend

**Opción A: Script PowerShell (Recomendado para Windows)**

```powershell
cd backend
.\crear-env.ps1
```

Este script te guiará para crear el archivo `.env` con todas las configuraciones necesarias.

**Opción B: Crear manualmente el archivo `.env`**

Crea un archivo `.env` en la carpeta `backend/` con este contenido:

```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=credisa_inventory
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_AQUI
JWT_SECRET=credisa_secret_key_cambiar_en_produccion
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

**⚠️ CRÍTICO**: Reemplaza `TU_CONTRASEÑA_AQUI` con tu contraseña real de PostgreSQL.

### Paso 4: Verificar Conexión (Opcional)

```powershell
cd backend
.\verificar-conexion.ps1
```

### Paso 5: Inicializar Base de Datos

```bash
cd backend
npm run seed
```

Esto creará:
- Usuario gerente: `gerente@credisa.com` / `gerente123`
- Usuario empleado: `empleado@credisa.com` / `empleado123`
- Categorías y proveedores de ejemplo

### Paso 6: Ejecutar el Sistema

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend (en otra terminal):**
```bash
cd frontend
npm start
```

O ejecutar ambos desde la raíz:
```bash
npm run dev
```

### Solución de Problemas de Conexión

Si tienes errores de autenticación con PostgreSQL, consulta:
- `backend/SOLUCION_BD.md` - Guía detallada de solución
- `INSTALACION.md` - Instrucciones completas de instalación

### Frontend

```bash
cd frontend
npm install
npm start
```

### Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb credisa_inventory

# Ejecutar migraciones
cd backend
npm run migrate
```

## Variables de Entorno

Ver archivos `.env.example` en cada directorio para configuración.

## Desarrollo

Seguimos la metodología XP (Extreme Programming) con:
- Desarrollo iterativo e incremental
- Entregas frecuentes
- Testing automatizado
- Refactoring continuo

