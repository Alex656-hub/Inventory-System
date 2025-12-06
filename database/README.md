# Configuración de la Base de Datos

Este directorio contiene los scripts y la documentación necesaria para configurar y gestionar la base de datos del sistema de inventario CREDISA.

## Requisitos Previos

- PostgreSQL 12 o superior
- Node.js 14.x o superior
- npm o yarn

## Configuración Inicial

1. **Crear la base de datos**
   ```sql
   CREATE DATABASE credisa_inventory;
   CREATE USER credisa_user WITH PASSWORD 'una_contraseña_segura';
   GRANT ALL PRIVILEGES ON DATABASE credisa_inventory TO credisa_user;
   ```

2. **Configurar las variables de entorno**
   Crea un archivo `.env` en el directorio `backend` con las siguientes variables:
   ```env
   DB_NAME=credisa_inventory
   DB_USER=credisa_user
   DB_PASSWORD=una_contraseña_segura
   DB_HOST=localhost
   DB_PORT=5432
   NODE_ENV=development
   ```

## Comandos Disponibles

Desde el directorio `backend`, puedes ejecutar los siguientes comandos:

- `npm run db:init` - Inicializa la base de datos (crea tablas si no existen)
- `npm run db:reset` - Recrea completamente la base de datos (¡CUIDADO! Esto eliminará todos los datos)
- `npm run db:seed` - Ejecuta los seeders para poblar la base de datos con datos de prueba
- `npm run db:migrate` - Ejecuta las migraciones pendientes

## Estructura de la Base de Datos

### Tablas Principales

- `Users` - Usuarios del sistema (gerentes, empleados)
- `Categories` - Categorías de productos
- `Products` - Productos del inventario
- `Suppliers` - Proveedores de productos
- `EntradaInventario` - Registro de entradas al inventario
- `DetalleEntrada` - Detalle de los productos en cada entrada
- `SalidaInventario` - Registro de salidas del inventario
- `DetalleSalida` - Detalle de los productos en cada salida
- `MovimientoInventario` - Registro de movimientos de inventario

## Respaldo y Restauración

### Crear un respaldo
```bash
pg_dump -U credisa_user -d credisa_inventory > credisa_backup_$(date +%Y%m%d).sql
```

### Restaurar desde un respaldo
```bash
psql -U credisa_user -d credisa_inventory < credisa_backup_20231206.sql
```

## Solución de Problemas

### Error de conexión
- Verifica que el servicio de PostgreSQL esté en ejecución
- Confirma que el usuario y la contraseña sean correctos
- Asegúrate de que el puerto 5432 esté accesible

### Problemas de permisos
- Verifica que el usuario de la base de datos tenga los permisos necesarios
- Ejecuta `GRANT ALL PRIVILEGES ON DATABASE credisa_inventory TO credisa_user;` si es necesario

## Migraciones

Las migraciones se manejan automáticamente a través de Sequelize. Para crear una nueva migración:

1. Crea un nuevo archivo en `src/database/migrations/` siguiendo el patrón `YYYYMMDDHHmmss-nombre-de-la-migracion.ts`
2. Implementa las funciones `up` y `down` para aplicar y revertir la migración respectivamente
3. Ejecuta `npm run db:migrate` para aplicar la migración

## Datos de Prueba

El sistema incluye datos de prueba que se pueden cargar con:

```bash
npm run db:seed
```

Esto creará:
- Usuarios de prueba (gerente y empleado)
- Categorías de ejemplo
- Proveedores de ejemplo
