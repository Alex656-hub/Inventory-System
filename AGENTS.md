# AGENTS.md - Inventory-System

## Running the project

```powershell
# Both simultaneously (root)
npm run dev

# Or separately
cd backend && npm run dev   # Port 3001
cd frontend && npm start    # Port 3000
```

## Prerequisites (required before running)

1. PostgreSQL running with database `credisa_inventory` created
2. `backend/.env` file configured (especially DB_PASSWORD)
3. Dependencies installed: `npm run install:all` at root
4. Seed executed: `cd backend && npm run db:seed`

## Default credentials

- Gerente: `gerente` / `gerente123` (or `gerente@credisa.com` / `gerente123`)
- Empleado: `empleado` / `empleado123` (or `empleado@credisa.com` / `empleado123`)

Login accepts `usuario` (auto-appends `@credisa.com`) or full `email`.

## Project structure

- `backend/` - Express API (port 3001)
- `frontend/` - React 19 app (port 3000)
- API base: `http://localhost:3001/api` (configurable via REACT_APP_API_URL)

## Database

- ORM: Sequelize with PostgreSQL
- Models auto-sync on backend startup (no migrations required)
- Reset (solo tablas): `npm run db:reset` in backend
- Full reset + seed (recomendado): `npm run db:full-reset` in backend

## Key entry points

- Backend: `backend/src/index.ts`
- Frontend: `frontend/src/App.tsx`
- API config: `frontend/src/config/api.ts`

## Login & Auth

- Login accepts `usuario` or `email` (`auth.controller.ts`)
- If `usuario` is provided (no `@`), auto-appends `@credisa.com`
- JWT payload includes: `id`, `email`, `usuario`, `rol`, `permisos`
- 2FA flow resolves email from username if needed

## Permission System (14 modules)

User model has `usuario` (STRING, unique) and `permisos` (JSONB) fields.

### Permisos interface (`User.ts`, `types/index.ts`)
```
dashboard, catalogoProductos, operacionesStock, historialKardex,
reporteInventario, alertasStock, clientes, sedesAlmacenes,
proveedores, unidades, personal, categorias,
usuariosAccesos, ajustes
```

### Permission enforcement (3 layers)

1. **Sidebar** (`Layout.tsx`): checks `usuario?.permisos?.modulo` — hides the link
2. **PrivateRoute** (`PrivateRoute.tsx`): `requiredPermission` prop — redirects if URL is typed directly
3. **Backend middleware** (`auth.middleware.ts`): `verificarPermiso('modulo')` — rejects requests without permission

### Backend middleware

- `verificarPermiso(keyof Permisos)` — checks `req.usuario.permisos[permiso]`; gerentes always pass
- `soloGerente` — used for write operations (create/edit/delete) on admin modules
- Routes with `soloGerente` for writes + `verificarPermiso` for reads: products, categories, suppliers, units, personal, config, alerts

### Default permission sets

| Set | Role | Value |
|---|---|---|
| `PERMISOS_DEFAULT` | gerente | all `true` |
| `PERMISOS_BASICO` | empleado | all `false` |

- Creating a gerente: all `true` (cannot override via API)
- Creating an empleado: respects `body.permisos` if provided, else all `false`
- Updating user: role change to gerente resets permisos to all `true` unless explicit `permisos` in body

### UserAccess.tsx
- Full CRUD with real API (`user.service.ts`)
- Modal create/edit with permission toggles for all 14 modules
- Toggle active/inactive, soft delete
- Only sends `permisos` when role is `empleado`

## Relevant files

- `backend/src/models/User.ts` — `usuario`, `permisos` fields + `Permisos` interface + default sets
- `backend/src/controllers/user.controller.ts` — auto-generates email, handles permisos
- `backend/src/controllers/auth.controller.ts` — login accepts usuario/email, JWT includes permisos
- `backend/src/middleware/auth.middleware.ts` — `verificarToken`, `verificarRol`, `verificarPermiso`, `soloGerente`, `gerenteOEmpleado`
- `backend/src/database/seed.ts` — seed with usuario + permisos (2 variant sets)
- `backend/scripts/reset-permisos.cjs` — migrates existing users to 14-module permisos
- `backend/tsconfig.json` — `module: "Node16"`, `moduleResolution: "node16"`
- `frontend/src/types/index.ts` — `Permisos` (14 fields), `Usuario`, `LoginRequest`
- `frontend/src/services/user.service.ts` — full CRUD
- `frontend/src/components/UserAccess.tsx` — permission management UI
- `frontend/src/components/Login.tsx` — username or email login
- `frontend/src/components/PrivateRoute.tsx` — `requiredPermission` prop
- `frontend/src/components/Layout.tsx` — sidebar with permisos checks
- `frontend/src/components/Ajustes.css` — `.btn.btn-primary` selector (specificity fix)

## CSS specificity note

- `.btn` from AlertList.css overrides backgrounds with `#ffffff` (specificity 0,1,0)
- `.btn.btn-primary` (0,2,0) beats it for primary buttons
- Logo upload button uses direct hex values (`#00a6f4`, `#0084d1`) instead of CSS variables

## Testing / Linting

- No configured lint/typecheck scripts (not available)
- Run build to verify compilation: `cd backend && npm run build`