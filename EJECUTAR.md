# 🚀 Cómo Ejecutar el Sistema de Inventario

## Opción 1: Ejecutar Backend y Frontend por Separado (Recomendado)

### Terminal 1 - Backend

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

### Terminal 2 - Frontend

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

1. ✅ **PostgreSQL está corriendo**
2. ✅ **Base de datos creada**: `credisa_inventory`
3. ✅ **Archivo `.env`** creado en `backend/` con la contraseña correcta
4. ✅ **Dependencias instaladas**: `npm install` en backend y frontend
5. ✅ **Seed ejecutado**: `npm run seed` en backend

---

## Iniciar Sesión

Una vez que el frontend esté corriendo:

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

