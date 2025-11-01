# Script PowerShell para crear el archivo .env


Write-Host "🔧 Configuración del archivo .env" -ForegroundColor Cyan
Write-Host ""

$dbPassword = Read-Host "Ingresa la contraseña de PostgreSQL para el usuario 'postgres'"
$dbName = Read-Host "Nombre de la base de datos [credisa_inventory]" 
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "credisa_inventory" }
$dbUser = Read-Host "Usuario de PostgreSQL [postgres]"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }
$dbHost = Read-Host "Host de PostgreSQL [localhost]"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }
$dbPort = Read-Host "Puerto de PostgreSQL [5432]"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$jwtSecret = Read-Host "JWT Secret [credisa_secret_key_cambiar_en_produccion_123456]"
if ([string]::IsNullOrWhiteSpace($jwtSecret)) { $jwtSecret = "credisa_secret_key_cambiar_en_produccion_123456" }

$envContent = @"
# Configuración del servidor
PORT=3001
NODE_ENV=development

# Base de datos PostgreSQL
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_NAME=$dbName
DB_USER=$dbUser
DB_PASSWORD=$dbPassword

# JWT
JWT_SECRET=$jwtSecret
JWT_EXPIRE=7d

# CORS
FRONTEND_URL=http://localhost:3000
"@

try {
    $envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host ""
    Write-Host "✅ Archivo .env creado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Contenido del archivo:" -ForegroundColor Yellow
    Write-Host $envContent
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Verifica que la contraseña de PostgreSQL sea correcta" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "❌ Error al crear el archivo .env: $_" -ForegroundColor Red
}

