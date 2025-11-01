# Script para verificar la conexión a PostgreSQL
# Ejecuta este script desde la carpeta backend/

Write-Host "🔍 Verificando configuración de conexión a PostgreSQL..." -ForegroundColor Cyan
Write-Host ""

# Cargar variables de entorno
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Archivo .env NO encontrado" -ForegroundColor Red
    Write-Host "   Ejecuta: .\crear-env.ps1 para crearlo" -ForegroundColor Yellow
    exit 1
}

$dbHost = $env:DB_HOST ?? "localhost"
$dbPort = $env:DB_PORT ?? "5432"
$dbName = $env:DB_NAME ?? "credisa_inventory"
$dbUser = $env:DB_USER ?? "postgres"
$dbPassword = $env:DB_PASSWORD ?? ""

Write-Host ""
Write-Host "📋 Configuración actual:" -ForegroundColor Yellow
Write-Host "   Host: $dbHost"
Write-Host "   Puerto: $dbPort"
Write-Host "   Base de datos: $dbName"
Write-Host "   Usuario: $dbUser"
Write-Host "   Contraseña: $(if ($dbPassword) { '***' } else { 'NO CONFIGURADA' })"
Write-Host ""

if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    Write-Host "❌ La contraseña de PostgreSQL no está configurada en .env" -ForegroundColor Red
    exit 1
}

Write-Host "🧪 Intentando conectar a PostgreSQL..." -ForegroundColor Cyan

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "⚠️  psql no está en el PATH. Intentando con Node.js..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para verificar manualmente, ejecuta:" -ForegroundColor Yellow
    Write-Host "   psql -U $dbUser -h $dbHost -d $dbName" -ForegroundColor White
    Write-Host ""
    Write-Host "O prueba ejecutando:" -ForegroundColor Yellow
    Write-Host "   npm run seed" -ForegroundColor White
    exit 0
}

# Intentar conexión con psql
$connectionTest = echo "SELECT 1;" | psql -U $dbUser -h $dbHost -d $dbName -w 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexión a PostgreSQL exitosa!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes ejecutar ahora:" -ForegroundColor Yellow
    Write-Host "   npm run seed" -ForegroundColor White
} else {
    Write-Host "❌ Error al conectar a PostgreSQL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "   1. La contraseña en .env es incorrecta"
    Write-Host "   2. PostgreSQL no está corriendo"
    Write-Host "   3. La base de datos '$dbName' no existe"
    Write-Host "   4. El usuario '$dbUser' no tiene permisos"
    Write-Host ""
    Write-Host "Sugerencias:" -ForegroundColor Cyan
    Write-Host "   - Verifica que PostgreSQL esté corriendo"
    Write-Host "   - Crea la base de datos: CREATE DATABASE $dbName;"
    Write-Host "   - Verifica la contraseña en el archivo .env"
}

