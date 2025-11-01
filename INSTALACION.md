# Guía de Instalación - Sistema de Inventario CREDISA

Esta guía te ayudará a configurar y ejecutar el sistema de gestión de inventario desde cero.

## Requisitos Previos

- **Node.js** (v18 o superior)
- **PostgreSQL** (v12 o superior)
- **npm** o **yarn**

## Paso 1: Clonar e Instalar Dependencias

```bash
# Instalar dependencias de la raíz
npm install

# O instalar todo de una vez
npm run install:all
```

## Paso 2: Configurar Base de Datos PostgreSQL

1. Crear la base de datos:
```sql
CREATE DATABASE credisa_inventory;
```

2. Configurar las variables de entorno del backend:

Copia el archivo `.env.example` y créalo como `.env` en la carpeta `backend/`:

```bash
cd backend
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales de PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=credisa_inventory
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=tu_clave_secreta_super_segura
```

## Paso 3: Configurar Frontend

1. Configurar la URL de la API:

Crea un archivo `.env` en la carpeta `frontend/`:

```bash
cd frontend
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
```

## Paso 4: Inicializar Base de Datos y Crear Datos de Prueba

```bash
cd backend

# Compilar TypeScript
npm run build

# Ejecutar seed para crear usuario inicial y datos de ejemplo
npm run seed
```

Esto creará:
- **Usuario Gerente**: `gerente@credisa.com` / `gerente123`
- **Usuario Empleado**: `empleado@credisa.com` / `empleado123`
- Categorías de ejemplo
- Proveedores de ejemplo

**⚠️ IMPORTANTE**: Cambia estas contraseñas en producción.

## Paso 5: Ejecutar el Sistema

### Opción 1: Ejecutar Backend y Frontend por Separado

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

El backend estará disponible en `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

El frontend se abrirá automáticamente en `http://localhost:3000`

### Opción 2: Ejecutar Todo desde la Raíz

```bash
npm run dev
```

## Paso 6: Acceder al Sistema

1. Abre tu navegador en `http://localhost:3000`
2. Inicia sesión con:
   - **Email**: `gerente@credisa.com`
   - **Contraseña**: `gerente123`

## Estructura del Proyecto

```
Inventory-System/
├── backend/              # API REST (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/       # Configuración de base de datos
│   │   ├── controllers/  # Controladores de la API
│   │   ├── models/       # Modelos de Sequelize
│   │   ├── routes/       # Rutas de la API
│   │   ├── middleware/   # Middlewares (autenticación, etc.)
│   │   └── database/     # Scripts de migración y seed
│   └── package.json
├── frontend/             # Aplicación React + TypeScript
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── services/     # Servicios de API
│   │   ├── config/       # Configuración
│   │   └── types/        # Tipos TypeScript
│   └── package.json
└── database/             # Scripts SQL de referencia
```

## Endpoints de la API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/perfil` - Obtener perfil del usuario

### Productos (requiere autenticación)
- `GET /api/products` - Listar productos (gerente y empleado)
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto (solo gerente)
- `PUT /api/products/:id` - Actualizar producto (solo gerente)
- `DELETE /api/products/:id` - Eliminar producto (solo gerente)
- `GET /api/products/stock-bajo` - Productos con stock bajo

### Categorías
- `GET /api/categories` - Listar categorías
- `GET /api/categories/:id` - Obtener categoría por ID
- `POST /api/categories` - Crear categoría (solo gerente)
- `PUT /api/categories/:id` - Actualizar categoría (solo gerente)
- `DELETE /api/categories/:id` - Eliminar categoría (solo gerente)

### Proveedores
- `GET /api/suppliers` - Listar proveedores
- `GET /api/suppliers/:id` - Obtener proveedor por ID
- `POST /api/suppliers` - Crear proveedor (solo gerente)
- `PUT /api/suppliers/:id` - Actualizar proveedor (solo gerente)
- `DELETE /api/suppliers/:id` - Eliminar proveedor (solo gerente)

## Roles de Usuario

### Gerente
- Acceso completo a todas las funcionalidades
- Puede crear, editar y eliminar productos, categorías, proveedores y usuarios
- Acceso a análisis financiero y predicciones (cuando se implementen)

### Empleado
- Puede consultar productos, categorías y proveedores
- Puede registrar entradas y salidas de inventario (pendiente de implementar)
- No puede crear, editar o eliminar productos
- No tiene acceso a funciones administrativas

## Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `backend/.env`
- Asegúrate de que la base de datos `credisa_inventory` existe

### Error de puerto en uso
- Backend por defecto usa el puerto 3001
- Frontend por defecto usa el puerto 3000
- Si están ocupados, cambia los puertos en los archivos de configuración

### Error de CORS
- Verifica que `FRONTEND_URL` en `backend/.env` coincida con la URL del frontend
- Por defecto debería ser `http://localhost:3000`

## Próximos Pasos

1. ✅ Sistema de autenticación y roles
2. ✅ Gestión de productos básica
3. ⏳ Gestión de entradas (compras)
4. ⏳ Gestión de salidas (ventas)
5. ⏳ Reportes y dashboard avanzado
6. ⏳ Análisis financiero
7. ⏳ Modelos predictivos con Machine Learning

## Soporte

Para más información, consulta el README.md principal del proyecto.

