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

- Gerente: `gerente@credisa.com` / `gerente123`
- Empleado: `empleado@credisa.com` / `empleado123`

## Project structure

- `backend/` - Express API (port 3001)
- `frontend/` - React 19 app (port 3000)
- API base: `http://localhost:3001/api` (configurable via REACT_APP_API_URL)

## Database

- ORM: Sequelize with PostgreSQL
- Models auto-sync on backend startup (no migrations required)
- Reset: `npm run db:reset` in backend

## Key entry points

- Backend: `backend/src/index.ts`
- Frontend: `frontend/src/App.tsx`
- API config: `frontend/src/config/api.ts`

## Testing / Linting

- No configured lint/typecheck scripts (not available)
- Run build to verify compilation: `cd backend && npm run build`